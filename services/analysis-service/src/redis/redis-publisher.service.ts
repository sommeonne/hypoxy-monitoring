import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisPublisherService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisPublisherService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async xadd(stream: string, data: Record<string, string>): Promise<void> {
    const fields: string[] = [];
    for (const [k, v] of Object.entries(data)) fields.push(k, v);
    await this.client.xadd(stream, '*', ...fields);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
