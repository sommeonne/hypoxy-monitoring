import {
  WebSocketGateway, WebSocketServer, OnGatewayInit,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }, namespace: '/' })
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
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
