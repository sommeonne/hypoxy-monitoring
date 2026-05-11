import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateMeasurementDto, doctorId: string): Promise<Measurement | null> {
    const session = await this.resolveDoctorsSession(doctorId);
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

  async getSessionStats(sessionId: string): Promise<{
    totalMeasurements: number;
    avgSpo2: number; minSpo2: number; maxSpo2: number;
    avgHeartRate: number; minHeartRate: number; maxHeartRate: number;
    avgRespiratoryRate: number; minRespiratoryRate: number; maxRespiratoryRate: number;
    avgTidalVolume: number | null; minTidalVolume: number | null; maxTidalVolume: number | null;
    firstMeasurement: Measurement | null;
    lastMeasurement: Measurement | null;
  }> {
    const raw = await this.measurementRepo
      .createQueryBuilder('m')
      .select('COUNT(*)', 'total')
      .addSelect('AVG(m.spo2)', 'avgSpo2')
      .addSelect('MIN(m.spo2)', 'minSpo2')
      .addSelect('MAX(m.spo2)', 'maxSpo2')
      .addSelect('AVG(m.heartRate)', 'avgHeartRate')
      .addSelect('MIN(m.heartRate)', 'minHeartRate')
      .addSelect('MAX(m.heartRate)', 'maxHeartRate')
      .addSelect('AVG(m.respiratoryRate)', 'avgRespiratoryRate')
      .addSelect('MIN(m.respiratoryRate)', 'minRespiratoryRate')
      .addSelect('MAX(m.respiratoryRate)', 'maxRespiratoryRate')
      .addSelect('AVG(m.tidalVolume)', 'avgTidalVolume')
      .addSelect('MIN(m.tidalVolume)', 'minTidalVolume')
      .addSelect('MAX(m.tidalVolume)', 'maxTidalVolume')
      .where('m.sessionId = :sessionId', { sessionId })
      .getRawOne();

    const parse = (v: string | null) => (v != null ? parseFloat(v) : null);
    const total = parseInt(raw?.total ?? '0', 10);

    const [firstMeasurement, lastMeasurement] = await Promise.all([
      this.measurementRepo.findOne({ where: { sessionId }, order: { createdAt: 'ASC' } }),
      this.measurementRepo.findOne({ where: { sessionId }, order: { createdAt: 'DESC' } }),
    ]);

    return {
      totalMeasurements: total,
      avgSpo2: parse(raw?.avgSpo2) ?? 0,
      minSpo2: parse(raw?.minSpo2) ?? 0,
      maxSpo2: parse(raw?.maxSpo2) ?? 0,
      avgHeartRate: parse(raw?.avgHeartRate) ?? 0,
      minHeartRate: parse(raw?.minHeartRate) ?? 0,
      maxHeartRate: parse(raw?.maxHeartRate) ?? 0,
      avgRespiratoryRate: parse(raw?.avgRespiratoryRate) ?? 0,
      minRespiratoryRate: parse(raw?.minRespiratoryRate) ?? 0,
      maxRespiratoryRate: parse(raw?.maxRespiratoryRate) ?? 0,
      avgTidalVolume: parse(raw?.avgTidalVolume),
      minTidalVolume: parse(raw?.minTidalVolume),
      maxTidalVolume: parse(raw?.maxTidalVolume),
      firstMeasurement,
      lastMeasurement,
    };
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

  private async resolveDoctorsSession(doctorId: string): Promise<ActiveSession | null> {
    const raw = await this.redisPublisher.get(`session:doctor:${doctorId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  }
}
