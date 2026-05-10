import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { RedisPublisherService } from '../redis/redis-publisher.service';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly repo: Repository<Alert>,
    private readonly redis: RedisPublisherService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    const alert = this.repo.create(dto);
    const saved = await this.repo.save(alert);
    await this.redis.publish('alerts', JSON.stringify(saved));
    return saved;
  }

  findAll(patientId?: string, sessionId?: string): Promise<Alert[]> {
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (sessionId) where.sessionId = sessionId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  findByPatient(patientId: string): Promise<Alert[]> {
    return this.repo.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }

  async verifySessionAccess(sessionId: string, doctorId: string, role: string): Promise<void> {
    const base = this.config.get('SESSION_SERVICE_URL', 'http://session-service:3005');
    const res = await fetch(`${base}/sessions/${sessionId}`, {
      headers: { 'x-user-id': doctorId, 'x-user-role': role },
    });
    if (!res.ok) throw new ForbiddenException('Access denied');
  }

  async verifyPatientAccess(patientId: string, doctorId: string, role: string): Promise<void> {
    const base = this.config.get('PATIENT_SERVICE_URL', 'http://patient-service:3002');
    const res = await fetch(`${base}/patients/${patientId}`, {
      headers: { 'x-user-id': doctorId, 'x-user-role': role },
    });
    if (!res.ok) throw new ForbiddenException('Access denied');
  }
}
