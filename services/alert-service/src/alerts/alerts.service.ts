import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { AlertsGateway } from './alerts.gateway';
import { RedisPublisherService } from '../redis/redis-publisher.service';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly repo: Repository<Alert>,
    private readonly gateway: AlertsGateway,
    private readonly redis: RedisPublisherService,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    const alert = this.repo.create(dto);
    const saved = await this.repo.save(alert);
    this.gateway.broadcastAlert(saved);
    await this.redis.publish('alerts', JSON.stringify(saved));
    return saved;
  }

  findAll(patientId?: string): Promise<Alert[]> {
    const where: any = {};
    if (patientId) where.patientId = patientId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  findByPatient(patientId: string): Promise<Alert[]> {
    return this.repo.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }
}
