import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Session, SessionStatus, SessionSummary } from './session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { RedisPublisherService } from '../redis/redis-publisher.service';

interface DeviceStats {
  totalMeasurements: number;
  avgSpo2: number; minSpo2: number; maxSpo2: number;
  avgHeartRate: number; minHeartRate: number; maxHeartRate: number;
  avgRespiratoryRate: number; minRespiratoryRate: number; maxRespiratoryRate: number;
  avgTidalVolume: number; minTidalVolume: number; maxTidalVolume: number;
  firstMeasurement: { spo2: number; heartRate: number; respiratoryRate: number; tidalVolume: number };
  lastMeasurement: { spo2: number; heartRate: number; respiratoryRate: number; tidalVolume: number };
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
    private readonly redisPublisher: RedisPublisherService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateSessionDto, doctorId: string): Promise<Session> {
    const session = this.repo.create({
      ...dto,
      doctorId,
      startedAt: new Date(),
      status: SessionStatus.ACTIVE,
    });
    const saved = await this.repo.save(session);
    await this.redisPublisher.publish('sessions', JSON.stringify(saved));
    await this.redisPublisher.set(
      'current_session',
      JSON.stringify({ id: saved.id, doctorId: saved.doctorId, patientId: saved.patientId }),
    );
    return saved;
  }

  async end(id: string, doctorId?: string): Promise<Session> {
    const session = await this.findOne(id, doctorId);
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active');
    }

    const internalHeaders = { 'x-user-id': doctorId ?? '', 'x-user-role': 'doctor' };

    const deviceBase = this.config.get('DEVICE_SERVICE_URL', 'http://device-service:3001');
    const alertBase = this.config.get('ALERT_SERVICE_URL', 'http://alert-service:3004');
    const patientBase = this.config.get('PATIENT_SERVICE_URL', 'http://patient-service:3002');
    const analysisBase = this.config.get('ANALYSIS_SERVICE_URL', 'http://analysis-service:3003');

    const [statsRes, alertCountRes, patientRes] = await Promise.all([
      fetch(`${deviceBase}/devices/stats/${id}`, { headers: internalHeaders }),
      fetch(`${alertBase}/alerts/count/${id}`, { headers: internalHeaders }),
      fetch(`${patientBase}/patients/${session.patientId}`, { headers: internalHeaders }),
    ]);

    const stats: DeviceStats = statsRes.ok ? await statsRes.json() : this.emptyStats();
    const alertCount: number = alertCountRes.ok ? (await alertCountRes.json()).count : 0;
    const patient = patientRes.ok ? await patientRes.json() : null;

    const concludeBody = {
      finalSpo2: stats.lastMeasurement?.spo2 ?? null,
      finalHeartRate: stats.lastMeasurement?.heartRate ?? null,
      finalRespiratoryRate: stats.lastMeasurement?.respiratoryRate ?? null,
      finalTidalVolume: stats.lastMeasurement?.tidalVolume ?? null,
      o2Percentage: session.o2Percentage ?? null,
      firstHeartRate: stats.firstMeasurement?.heartRate ?? null,
      firstRespiratoryRate: stats.firstMeasurement?.respiratoryRate ?? null,
      baselineHeartRate: patient?.baselineHeartRate ?? null,
      baselineRespiratoryRate: patient?.baselineRespiratoryRate ?? null,
      baselineTidalVolume: patient?.baselineTidalVolume ?? null,
    };

    let conclusion: string | undefined;
    try {
      const concludeRes = await fetch(`${analysisBase}/analysis/conclude`, {
        method: 'POST',
        headers: { ...internalHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(concludeBody),
      });
      if (concludeRes.ok) {
        const data = await concludeRes.json();
        conclusion = data.conclusion;
      }
    } catch (err) {
      this.logger.warn(`Could not fetch conclusion from analysis-service: ${err}`);
    }

    const endedAt = new Date();
    const durationMinutes = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000);

    const summary: SessionSummary = {
      durationMinutes,
      totalMeasurements: stats.totalMeasurements,
      alertCount,
      avgSpo2: stats.avgSpo2,
      minSpo2: stats.minSpo2,
      maxSpo2: stats.maxSpo2,
      avgHeartRate: stats.avgHeartRate,
      minHeartRate: stats.minHeartRate,
      maxHeartRate: stats.maxHeartRate,
      avgRespiratoryRate: stats.avgRespiratoryRate,
      minRespiratoryRate: stats.minRespiratoryRate,
      maxRespiratoryRate: stats.maxRespiratoryRate,
      avgTidalVolume: stats.avgTidalVolume,
      minTidalVolume: stats.minTidalVolume,
      maxTidalVolume: stats.maxTidalVolume,
    };

    Object.assign(session, {
      endedAt,
      status: SessionStatus.COMPLETED,
      summary,
      ...(conclusion != null && { conclusion }),
    });

    const updated = await this.repo.save(session);
    await this.redisPublisher.publish('sessions', JSON.stringify(updated));
    await this.redisPublisher.del('current_session');
    return updated;
  }

  async findOne(id: string, doctorId?: string): Promise<Session> {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (doctorId && session.doctorId !== doctorId) throw new ForbiddenException('Access denied');
    return session;
  }

  findByPatient(patientId: string, doctorId: string): Promise<Session[]> {
    return this.repo.find({
      where: { patientId, doctorId },
      order: { startedAt: 'DESC' },
    });
  }

  findActive(doctorId?: string): Promise<Session[]> {
    const where: any = { status: SessionStatus.ACTIVE };
    if (doctorId) where.doctorId = doctorId;
    return this.repo.find({ where, order: { startedAt: 'DESC' } });
  }

  async updateNotes(id: string, notes: string | undefined, doctorId?: string): Promise<Session> {
    const session = await this.findOne(id, doctorId);
    session.notes = notes ?? null!;
    return this.repo.save(session);
  }

  private emptyStats(): DeviceStats {
    return {
      totalMeasurements: 0,
      avgSpo2: 0, minSpo2: 0, maxSpo2: 0,
      avgHeartRate: 0, minHeartRate: 0, maxHeartRate: 0,
      avgRespiratoryRate: 0, minRespiratoryRate: 0, maxRespiratoryRate: 0,
      avgTidalVolume: null, minTidalVolume: null, maxTidalVolume: null,
      firstMeasurement: null,
      lastMeasurement: null,
    };
  }
}
