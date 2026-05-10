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
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get('JWT_SECRET', 'secret'),
      });
      client.join(`doctor:${payload.sub}`);
      this.logger.debug(`Client ${client.id} joined doctor:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('join:session')
  handleJoin(@MessageBody() sessionId: string, @ConnectedSocket() client: Socket) {
    client.join(`session:${sessionId}`);
    this.logger.debug(`Client ${client.id} joined session:${sessionId}`);
  }

  @SubscribeMessage('leave:session')
  handleLeave(@MessageBody() sessionId: string, @ConnectedSocket() client: Socket) {
    client.leave(`session:${sessionId}`);
    this.logger.debug(`Client ${client.id} left session:${sessionId}`);
  }
}
