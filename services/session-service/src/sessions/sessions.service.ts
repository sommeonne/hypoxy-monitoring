import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async create(dto: CreateSessionDto): Promise<Session> {
    const session = this.repo.create({
      ...dto,
      startedAt: new Date(),
      status: SessionStatus.ACTIVE,
    });
    const saved = await this.repo.save(session);
    await this.redisPublisher.publish('sessions', JSON.stringify(saved));
    return saved;
  }

  async end(id: string, dto: EndSessionDto): Promise<Session> {
    const session = await this.findOne(id);
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active');
    }

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - session.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const summary: SessionSummary = {
      avgSpo2: dto.avgSpo2 ?? 0,
      avgHeartRate: dto.avgHeartRate ?? 0,
      avgRespiratoryRate: dto.avgRespiratoryRate ?? 0,
      minSpo2: dto.minSpo2 ?? 0,
      maxHeartRate: dto.maxHeartRate ?? 0,
      durationMinutes,
      totalMeasurements: dto.totalMeasurements ?? 0,
      alertCount: dto.alertCount ?? 0,
    };

    Object.assign(session, {
      endedAt,
      status: SessionStatus.COMPLETED,
      summary,
    });

    const updated = await this.repo.save(session);
    await this.redisPublisher.publish('sessions', JSON.stringify(updated));
    return updated;
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  findByPatient(patientId: string): Promise<Session[]> {
    return this.repo.find({
      where: { patientId },
      order: { startedAt: 'DESC' },
    });
  }

  findActive(): Promise<Session[]> {
    return this.repo.find({
      where: { status: SessionStatus.ACTIVE },
      order: { startedAt: 'DESC' },
    });
  }
}
