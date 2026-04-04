import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { AlertsGateway } from './alerts.gateway';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly repo: Repository<Alert>,
    private readonly gateway: AlertsGateway,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    const alert = this.repo.create(dto);
    const saved = await this.repo.save(alert);
    this.gateway.broadcastAlert(saved);
    return saved;
  }

  findAll(patientId?: string, acknowledged?: boolean): Promise<Alert[]> {
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (acknowledged !== undefined) where.acknowledged = acknowledged;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async acknowledge(id: string): Promise<Alert> {
    const alert = await this.repo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    alert.acknowledged = true;
    return this.repo.save(alert);
  }

  findByPatient(patientId: string): Promise<Alert[]> {
    return this.repo.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }

  findUnacknowledged(): Promise<Alert[]> {
    return this.repo.find({ where: { acknowledged: false }, order: { createdAt: 'DESC' } });
  }
}
