import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { AlertLevel, Measurement } from './thresholds';
import { RedisPublisherService } from '../redis/redis-publisher.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  const mockAlertsHttp = { createAlert: jest.fn().mockResolvedValue(undefined) };
  const mockRedisPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    xadd: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: RedisPublisherService, useValue: mockRedisPublisher },
      ],
    }).compile();
    service = module.get<AnalysisService>(AnalysisService);
    jest.clearAllMocks();
  });

  const base: Measurement = {
    id: 'uuid',
    patientId: 'patient-1',
    sessionId: 'session-1',
    spo2: 97,
    heartRate: 72,
    respiratoryRate: 16,
    createdAt: new Date(),
  };

  it('should return NORMAL for healthy measurements', async () => {
    const result = await service.analyze(base);
    expect(result.level).toBe(AlertLevel.NORMAL);
    expect(result.anomalies).toHaveLength(0);
    expect(mockAlertsHttp.createAlert).not.toHaveBeenCalled();
  });

  it('should return CRITICAL for SpO2 < 75', async () => {
    const result = await service.analyze({ ...base, spo2: 74 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
  });

  it('should return NORMAL for SpO2 >= 75', async () => {
    const result = await service.analyze({ ...base, spo2: 75 });
    expect(result.level).toBe(AlertLevel.NORMAL);
    expect(mockAlertsHttp.createAlert).not.toHaveBeenCalled();
  });

  it('should return NORMAL for heart rate between 40 and 150', async () => {
    const result = await service.analyze({ ...base, heartRate: 120 });
    expect(result.level).toBe(AlertLevel.NORMAL);
  });

  it('should return CRITICAL for heart rate < 40', async () => {
    const result = await service.analyze({ ...base, heartRate: 39 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
    expect(result.anomalies.some((a) => a.includes('critically abnormal'))).toBe(true);
  });

  it('should return CRITICAL for heart rate > 150', async () => {
    const result = await service.analyze({ ...base, heartRate: 151 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
  });

  it('should return CRITICAL for tidal volume < 250 mL', async () => {
    const result = await service.analyze({ ...base, tidalVolume: 200 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
    expect(result.anomalies.some((a) => a.includes('Tidal volume'))).toBe(true);
  });

  it('should return CRITICAL for tidal volume > 900 mL', async () => {
    const result = await service.analyze({ ...base, tidalVolume: 901 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
  });

  it('should return NORMAL for tidal volume within range', async () => {
    const result = await service.analyze({ ...base, tidalVolume: 500 });
    expect(result.level).toBe(AlertLevel.NORMAL);
  });

  it('should not call xadd for normal measurements', async () => {
    await service.analyze(base);
    expect(mockRedisPublisher.xadd).not.toHaveBeenCalled();
  });

  it('computeConclusion: high tolerance + normal reaction', () => {
    const result = service.computeConclusion({
      finalSpo2: 90,
      finalHeartRate: 72,
      finalRespiratoryRate: 16,
      firstHeartRate: 70,
      firstRespiratoryRate: 15,
    });
    expect(result.conclusion).toBe('Hypoxia tolerance high, reaction normal');
  });

  it('computeConclusion: elevated hemodynamic reaction', () => {
    const result = service.computeConclusion({
      finalSpo2: 90,
      finalHeartRate: 110,
      finalRespiratoryRate: 16,
      firstHeartRate: 70,
      firstRespiratoryRate: 15,
    });
    expect(result.conclusion).toContain('hemodynamic reaction elevated');
  });
});
