import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AlertsService } from '../alerts/alerts.service';
import { AlertLevel } from '../alerts/alert.entity';

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private readonly logger = new Logger(RedisSubscriberService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly alertsService: AlertsService,
  ) {}

  onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.subscriber.subscribe('critical', (err) => {
      if (err) this.logger.error('Failed to subscribe to critical channel', err);
      else this.logger.log('Subscribed to Redis channel: critical');
    });

    this.subscriber.on('message', async (_channel, message) => {
      try {
        const payload = JSON.parse(message);
        await this.alertsService.create({
          patientId: payload.patientId,
          sessionId: payload.sessionId,
          measurementId: payload.measurementId,
          level: payload.level as AlertLevel,
values: payload.values,
        });
      } catch (err) {
        this.logger.error('Failed to process critical event', err);
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}
