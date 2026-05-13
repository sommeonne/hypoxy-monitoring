import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AlertsService } from '../alerts/alerts.service';
import { AlertLevel } from '../alerts/alert.entity';

const STREAM = 'critical-alerts';
const GROUP = 'alert-processors';
const CONSUMER = 'worker';
const BLOCK_MS = 2000;
const COUNT = 10;

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private running = true;
  private readonly logger = new Logger(RedisSubscriberService.name);

  private sessionServiceUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly alertsService: AlertsService,
  ) {}

  private async fetchDoctorId(sessionId: string): Promise<string | undefined> {
    try {
      const res = await fetch(`${this.sessionServiceUrl}/sessions/${sessionId}`, {
        headers: { 'x-user-role': 'doctor' },
      });
      if (!res.ok) return undefined;
      const session = await res.json() as { doctorId?: string };
      return session.doctorId ?? undefined;
    } catch {
      return undefined;
    }
  }

  async onModuleInit() {
    this.sessionServiceUrl = this.config.get('SESSION_SERVICE_URL', 'http://session-service:3005');
    this.client = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    await this.client
      .xgroup('CREATE', STREAM, GROUP, '0', 'MKSTREAM')
      .catch((err: Error) => {
        if (!err.message.includes('BUSYGROUP')) throw err;
      });

    this.logger.log(`Consumer group '${GROUP}' ready on stream '${STREAM}'`);
    void this.poll();
  }

  private async poll() {
    await this.processPending();

    while (this.running) {
      try {
        const results = await (this.client.xreadgroup as Function)(
          'GROUP', GROUP, CONSUMER,
          'COUNT', COUNT,
          'BLOCK', BLOCK_MS,
          'STREAMS', STREAM, '>',
        ) as [string, [string, string[]][]][] | null;

        if (!results) continue;

        for (const [, entries] of results) {
          for (const [id, fields] of entries) {
            await this.processEntry(id, fields);
          }
        }
      } catch (err) {
        if (this.running) {
          this.logger.error('Error reading from stream', err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  private async processPending() {
    try {
      const results = await (this.client.xreadgroup as Function)(
        'GROUP', GROUP, CONSUMER,
        'COUNT', 100,
        'STREAMS', STREAM, '0',
      ) as [string, [string, string[]][]][] | null;

      if (!results) return;

      for (const [, entries] of results) {
        for (const [id, fields] of entries) {
          await this.processEntry(id, fields);
        }
      }
    } catch (err) {
      this.logger.error('Error recovering pending entries', err);
    }
  }

  private async processEntry(id: string, fields: string[]) {
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }

      const doctorId = await this.fetchDoctorId(data.sessionId);

      await this.alertsService.create({
        patientId: data.patientId,
        sessionId: data.sessionId,
        measurementId: data.measurementId,
        level: data.level as AlertLevel,
        values: JSON.parse(data.values),
        ...(doctorId && { doctorId }),
      });

      await this.client.xack(STREAM, GROUP, id);
      this.logger.debug(`Processed and ACKed alert ${id}`);
    } catch (err) {
      this.logger.error(`Failed to process alert entry ${id} — will retry`, err);

    }
  }

  async onModuleDestroy() {
    this.running = false;
    await this.client.quit();
  }
}
