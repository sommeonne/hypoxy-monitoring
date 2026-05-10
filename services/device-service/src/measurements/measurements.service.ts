import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { Measurement } from './measurement.entity';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { MeasurementsGateway } from './measurements.gateway';
import { RedisPublisherService } from '../redis/redis-publisher.service';

@Injectable()
export class MeasurementsService {
  private readonly sessionServiceUrl: string;

  constructor(
    @InjectRepository(Measurement)
    private readonly measurementRepo: Repository<Measurement>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly gateway: MeasurementsGateway,
    private readonly redisPublisher: RedisPublisherService,
    private readonly configService: ConfigService,
  ) {
    this.sessionServiceUrl = this.configService.get<string>(
      'SESSION_SERVICE_URL',
      'http://session-service:3005',
    );
  }

  private async resolveActiveSession(): Promise<{ id: string; patientId: string }> {
    let res: Response;
    try {
      res = await fetch(`${this.sessionServiceUrl}/sessions/active`, {
        headers: { 'x-user-role': 'doctor' },
      });
    } catch {
      throw new BadRequestException('Unable to reach session service');
    }
    if (!res.ok) {
      throw new BadRequestException('Unable to resolve active session');
    }
    const sessions = await res.json() as { id: string; patientId: string }[];
    if (!sessions.length) {
      throw new BadRequestException('No active session — start a session before sending measurements');
    }
    return sessions[0];
  }

  async create(dto: CreateMeasurementDto): Promise<Measurement> {
    const session = await this.resolveActiveSession();

    const measurement = this.measurementRepo.create({
      ...dto,
      sessionId: session.id,
      patientId: session.patientId,
    });
    const saved = await this.measurementRepo.save(measurement);

    await this.cache.set(`latest:${session.patientId}`, saved, 300);
    this.gateway.broadcastMeasurement(saved);
    await this.redisPublisher.publish('measurements', JSON.stringify(saved));

    return saved;
  }

  async findBySession(sessionId: string): Promise<Measurement[]> {
    return this.measurementRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatestByPatient(patientId: string): Promise<Measurement | null> {
    const cached = await this.cache.get<Measurement>(`latest:${patientId}`);
    if (cached) return cached;

    const measurement = await this.measurementRepo.findOne({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });

    if (measurement) {
      await this.cache.set(`latest:${patientId}`, measurement, 300);
    }
    return measurement;
  }
}
