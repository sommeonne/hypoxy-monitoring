import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { AlertLevel, Measurement } from './thresholds';
import { AlertsHttpService } from './alerts-http.service';
import { RedisPublisherService } from './redis-publisher.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  const mockAlertsHttp = { createAlert: jest.fn().mockResolvedValue(undefined) };
  const mockRedisPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: AlertsHttpService, useValue: mockAlertsHttp },
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

  it('should return CRITICAL for SpO2 < 80', async () => {
    const result = await service.analyze({ ...base, spo2: 79 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
    expect(mockAlertsHttp.createAlert).toHaveBeenCalledTimes(1);
  });

  it('should return NORMAL for SpO2 >= 80', async () => {
    const result = await service.analyze({ ...base, spo2: 80 });
    expect(result.level).toBe(AlertLevel.NORMAL);
    expect(mockAlertsHttp.createAlert).not.toHaveBeenCalled();
  });

  it('should return NORMAL for heart rate between 45 and 130', async () => {
    const result = await service.analyze({ ...base, heartRate: 120 });
    expect(result.level).toBe(AlertLevel.NORMAL);
  });

  it('should return CRITICAL for heart rate < 45', async () => {
    const result = await service.analyze({ ...base, heartRate: 44 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
    expect(result.anomalies.some((a) => a.includes('critically abnormal'))).toBe(true);
  });

  it('should return CRITICAL for heart rate > 130', async () => {
    const result = await service.analyze({ ...base, heartRate: 131 });
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

  it('should publish analysis result to Redis with level field', async () => {
    await service.analyze(base);
    expect(mockRedisPublisher.publish).toHaveBeenCalledWith(
      'analysis',
      expect.stringContaining('"level"'),
    );
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
