import {
  WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }, namespace: '/' })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) { client.disconnect(); return; }
    try {
      const payload = this.jwtService.verify<{ sub: string; role: string }>(token, {
        secret: this.config.get('JWT_SECRET', 'secret'),
      });
      if (payload.role !== 'doctor') {
        client.disconnect();
        return;
      }
      client.data.doctorId = payload.sub;
      client.join(`doctor:${payload.sub}`);
      this.logger.debug(`Client ${client.id} joined doctor:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('join:session')
  async handleJoin(@MessageBody() sessionId: string, @ConnectedSocket() client: Socket) {
    const doctorId = client.data.doctorId as string | undefined;
    if (!doctorId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const sessionServiceUrl = this.config.get('SESSION_SERVICE_URL', 'http://session-service:3005');
    try {
      const res = await fetch(`${sessionServiceUrl}/sessions/${sessionId}`, {
        headers: { 'x-user-id': doctorId, 'x-user-role': 'doctor' },
      });
      if (!res.ok) {
        client.emit('error', { message: 'Access denied to session' });
        return;
      }
    } catch (err) {
      this.logger.error(`Failed to verify session ${sessionId} ownership`, err);
      client.emit('error', { message: 'Could not verify session access' });
      return;
    }

    client.join(`session:${sessionId}`);
    this.logger.debug(`Client ${client.id} joined session:${sessionId}`);
  }

  @SubscribeMessage('leave:session')
  handleLeave(@MessageBody() sessionId: string, @ConnectedSocket() client: Socket) {
    client.leave(`session:${sessionId}`);
    this.logger.debug(`Client ${client.id} left session:${sessionId}`);
  }
}
