import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Measurement } from './measurement.entity';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { MeasurementsGateway } from './measurements.gateway';
import { RedisPublisherService } from '../redis/redis-publisher.service';

@Injectable()
export class MeasurementsService {
  constructor(
    @InjectRepository(Measurement)
    private readonly measurementRepo: Repository<Measurement>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly gateway: MeasurementsGateway,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  async create(dto: CreateMeasurementDto): Promise<Measurement> {
    const measurement = this.measurementRepo.create(dto);
    const saved = await this.measurementRepo.save(measurement);

    // Cache latest per patient
    await this.cache.set(`latest:${dto.patientId}`, saved, 300);

    // Broadcast via WebSocket
    this.gateway.broadcastMeasurement(saved);

    // Publish to Redis for analysis-service
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
