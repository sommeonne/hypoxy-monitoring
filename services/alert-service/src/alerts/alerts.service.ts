import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { RedisPublisherService } from '../redis/redis-publisher.service';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly repo: Repository<Alert>,
    private readonly redis: RedisPublisherService,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    const alert = this.repo.create(dto);
    const saved = await this.repo.save(alert);
    await this.redis.publish('alerts', JSON.stringify(saved));
    return saved;
  }

  findAll(doctorId: string, patientId?: string, sessionId?: string): Promise<Alert[]> {
    const where: any = { doctorId };
    if (patientId) where.patientId = patientId;
    if (sessionId) where.sessionId = sessionId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async countBySession(sessionId: string): Promise<{ count: number }> {
    const count = await this.repo.count({ where: { sessionId } });
    return { count };
  }

  findByPatient(doctorId: string, patientId: string): Promise<Alert[]> {
    return this.repo.find({ where: { doctorId, patientId }, order: { createdAt: 'DESC' } });
  }
}
