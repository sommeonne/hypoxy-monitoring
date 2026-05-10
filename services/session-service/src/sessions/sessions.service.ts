import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus, SessionSummary } from './session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { RedisPublisherService } from '../redis/redis-publisher.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
    private readonly redisPublisher: RedisPublisherService,
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

  async end(id: string, dto: EndSessionDto, doctorId?: string): Promise<Session> {
    const session = await this.findOne(id, doctorId);
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active');
    }

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - session.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const summary: SessionSummary = {
      durationMinutes,
      totalMeasurements: dto.totalMeasurements ?? 0,
      alertCount: dto.alertCount ?? 0,
      avgSpo2: dto.avgSpo2 ?? 0,
      minSpo2: dto.minSpo2 ?? 0,
      maxSpo2: dto.maxSpo2 ?? 0,
      avgHeartRate: dto.avgHeartRate ?? 0,
      minHeartRate: dto.minHeartRate ?? 0,
      maxHeartRate: dto.maxHeartRate ?? 0,
      avgRespiratoryRate: dto.avgRespiratoryRate ?? 0,
      minRespiratoryRate: dto.minRespiratoryRate ?? 0,
      maxRespiratoryRate: dto.maxRespiratoryRate ?? 0,
      avgTidalVolume: dto.avgTidalVolume ?? 0,
      minTidalVolume: dto.minTidalVolume ?? 0,
      maxTidalVolume: dto.maxTidalVolume ?? 0,
    };

    Object.assign(session, {
      endedAt,
      status: SessionStatus.COMPLETED,
      summary,
      ...(dto.conclusion != null && { conclusion: dto.conclusion }),
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
}
