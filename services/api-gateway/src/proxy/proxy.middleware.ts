import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ClientRequest } from 'http';

const ROUTE_MAP: Record<string, string> = {
  '/api/devices': 'DEVICE_SERVICE_URL',
  '/api/patients': 'PATIENT_SERVICE_URL',
  '/api/analysis': 'ANALYSIS_SERVICE_URL',
  '/api/alerts': 'ALERT_SERVICE_URL',
  '/api/sessions': 'SESSION_SERVICE_URL',
  '/api/reports': 'REPORT_SERVICE_URL',
};

const DEFAULT_URLS: Record<string, string> = {
  DEVICE_SERVICE_URL: 'http://device-service:3001',
  PATIENT_SERVICE_URL: 'http://patient-service:3002',
  ANALYSIS_SERVICE_URL: 'http://analysis-service:3003',
  ALERT_SERVICE_URL: 'http://alert-service:3004',
  SESSION_SERVICE_URL: 'http://session-service:3005',
  REPORT_SERVICE_URL: 'http://report-service:3006',
};

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);

  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    const routeKey = Object.keys(ROUTE_MAP).find((prefix) => path.startsWith(prefix));
    if (!routeKey) return next();

    const envKey = ROUTE_MAP[routeKey];
    const target = this.config.get(envKey, DEFAULT_URLS[envKey]);

    this.logger.debug(`Proxying ${req.method} ${path} → ${target}`);

    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^/api`]: '' },
      on: {
        proxyReq: (proxyReq: ClientRequest, req: Request) => {
          const body = (req as any).body;
          if (body !== undefined && body !== null) {
            const bodyData = JSON.stringify(body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
        },
        error: (_err: Error, _req: Request, res: Response) => {
          this.logger.error(`Proxy error for ${path}`);
          res.status(502).json({ message: 'Service unavailable', path });
        },
      },
    });

    proxy(req, res, next);
  }
}
