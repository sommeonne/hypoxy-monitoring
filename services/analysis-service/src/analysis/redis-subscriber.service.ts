import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AnalysisService } from './analysis.service';
import { Measurement } from './thresholds';

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private readonly logger = new Logger(RedisSubscriberService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly analysisService: AnalysisService,
  ) {}

  onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.subscriber.subscribe('measurements', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to measurements channel', err);
      } else {
        this.logger.log('Subscribed to Redis channel: measurements');
      }
    });

    this.subscriber.on('message', async (channel, message) => {
      if (channel !== 'measurements') return;
      try {
        const measurement: Measurement = JSON.parse(message);
        const result = await this.analysisService.analyze(measurement);
        this.logger.log(
          `Analyzed patient ${measurement.patientId}: ${result.level} (hypoxia index: ${result.hypoxiaIndex})`,
        );
      } catch (err) {
        this.logger.error('Error processing measurement', err);
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}
