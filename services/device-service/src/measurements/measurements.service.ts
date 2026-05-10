import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Measurement } from './measurement.entity';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { RedisPublisherService } from '../redis/redis-publisher.service';

interface ActiveSession {
  id: string;
  doctorId: string;
  patientId: string;
}

@Injectable()
export class MeasurementsService {
  constructor(
    @InjectRepository(Measurement)
    private readonly measurementRepo: Repository<Measurement>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  async create(dto: CreateMeasurementDto): Promise<Measurement | null> {
    const session = await this.resolveCurrentSession();
    if (!session) return null;

    const measurement = this.measurementRepo.create({
      sessionId: session.id,
      patientId: session.patientId,
      spo2: dto.spo2,
      heartRate: dto.heartRate,
      respiratoryRate: dto.respiratoryRate,
      o2Percentage: dto.o2Percentage,
      tidalVolume: dto.tidalVolume,
    });
    const saved = await this.measurementRepo.save(measurement);

    await this.cache.set(`latest:${session.patientId}`, saved, 300_000);
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
      await this.cache.set(`latest:${patientId}`, measurement, 300_000);
    }
    return measurement;
  }

  private async resolveCurrentSession(): Promise<ActiveSession | null> {
    const raw = await this.redisPublisher.get('current_session');
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  }
}
