import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EventsGateway } from './events.gateway';

const CHANNELS = ['measurements', 'alerts', 'sessions', 'analysis'] as const;
const CHANNEL_EVENT: Record<string, string> = {
  measurements: 'measurement:new',
  alerts: 'alert:new',
  sessions: 'session:updated',
  analysis: 'analysis:result',
};

@Injectable()
export class RedisRelayService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private readonly logger = new Logger(RedisRelayService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: EventsGateway,
  ) {}

  onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.subscriber.subscribe(...CHANNELS, (err) => {
      if (err) this.logger.error('Redis subscribe error', err);
      else this.logger.log(`Subscribed to Redis channels: ${CHANNELS.join(', ')}`);
    });

    this.subscriber.on('message', (channel, message) => {
      const event = CHANNEL_EVENT[channel];
      if (!event) return;
      try {
        const payload = JSON.parse(message);
        // measurements and analysis contain raw patient vitals — emit only to the
        // session room so other doctors' browsers never receive this data
        if (channel === 'measurements' || channel === 'analysis') {
          const sessionId = payload.sessionId;
          if (sessionId) {
            this.gateway.server.to(`session:${sessionId}`).emit(event, payload);
          }
        } else if (channel === 'alerts') {
          const sessionId = payload.sessionId;
          if (sessionId) {
            this.gateway.server.to(`session:${sessionId}`).emit(event, payload);
          }
        } else if (channel === 'sessions') {
          const doctorId = payload.doctorId;
          if (doctorId) {
            this.gateway.server.to(`doctor:${doctorId}`).emit(event, payload);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to relay ${channel} event`, err);
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}
