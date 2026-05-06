import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ClientRequest } from 'http';

const ROUTE_MAP: Record<string, string> = {
  '/api/auth': 'USER_SERVICE_URL',
  '/api/users': 'USER_SERVICE_URL',
  '/api/specializations': 'USER_SERVICE_URL',
  '/api/devices': 'DEVICE_SERVICE_URL',
  '/api/patients': 'PATIENT_SERVICE_URL',
  '/api/groups': 'PATIENT_SERVICE_URL',
  '/api/analysis': 'ANALYSIS_SERVICE_URL',
  '/api/alerts': 'ALERT_SERVICE_URL',
  '/api/sessions': 'SESSION_SERVICE_URL',
  '/api/reports': 'REPORT_SERVICE_URL',
};

const DEFAULT_URLS: Record<string, string> = {
  USER_SERVICE_URL: 'http://user-service:3007',
  DEVICE_SERVICE_URL: 'http://device-service:3001',
  PATIENT_SERVICE_URL: 'http://patient-service:3002',
  ANALYSIS_SERVICE_URL: 'http://analysis-service:3003',
  ALERT_SERVICE_URL: 'http://alert-service:3004',
  SESSION_SERVICE_URL: 'http://session-service:3005',
  REPORT_SERVICE_URL: 'http://report-service:3006',
};

// Routes that do not require a valid JWT before proxying
const PUBLIC_ROUTE_PREFIXES = ['/api/auth'];

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;

    const routeKey = Object.keys(ROUTE_MAP).find((prefix) => path.startsWith(prefix));
    if (!routeKey) return next();

    const isPublic = PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));

    let jwtPayload: { sub: string; role: string } | null = null;

    if (!isPublic) {
      const authHeader = req.headers['authorization'];
      const queryToken = req.query['token'] as string | undefined;
      const rawToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : queryToken;

      if (!rawToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      try {
        jwtPayload = this.jwtService.verify(rawToken);
      } catch {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
    }

    const envKey = ROUTE_MAP[routeKey];
    const target = this.config.get(envKey, DEFAULT_URLS[envKey]);

    this.logger.debug(`Proxying ${req.method} ${path} → ${target}`);

    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^/api`]: '' },
      on: {
        proxyReq: (proxyReq: ClientRequest, req: Request) => {
          if (jwtPayload) {
            proxyReq.setHeader('x-user-id', jwtPayload.sub);
            proxyReq.setHeader('x-user-role', jwtPayload.role);
          }
          const body = (req as any).body;
          if (body !== undefined && body !== null) {
            const bodyData = JSON.stringify(body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
        },
        error: (_err: Error, _req: Request, res: Response | any) => {
          this.logger.error(`Proxy error for ${path}`);
          if (typeof res.status === 'function') {
            res.status(502).json({ message: 'Service unavailable', path });
          }
        },
      },
    });

    proxy(req, res, next);
  }
}
