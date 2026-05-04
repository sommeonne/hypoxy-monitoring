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

  it('should return CRITICAL for SpO2 < 90', async () => {
    const result = await service.analyze({ ...base, spo2: 85 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
    expect(mockAlertsHttp.createAlert).toHaveBeenCalledTimes(1);
  });

  it('should return WARNING for SpO2 between 90 and 94', async () => {
    const result = await service.analyze({ ...base, spo2: 92 });
    expect(result.level).toBe(AlertLevel.WARNING);
  });

  it('should return WARNING for SpO2 > 98 (hyperoxia)', async () => {
    const result = await service.analyze({ ...base, spo2: 99 });
    expect(result.level).toBe(AlertLevel.WARNING);
    expect(result.anomalies.some((a) => a.includes('hyperoxia'))).toBe(true);
  });

  it('should return WARNING for heart rate outside 60–100 range', async () => {
    const result = await service.analyze({ ...base, heartRate: 120 });
    expect(result.level).toBe(AlertLevel.WARNING);
    expect(result.anomalies.some((a) => a.includes('Heart rate abnormal'))).toBe(true);
  });

  it('should return CRITICAL for heart rate < 40', async () => {
    const result = await service.analyze({ ...base, heartRate: 35 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
    expect(result.anomalies.some((a) => a.includes('critically abnormal'))).toBe(true);
  });

  it('should return CRITICAL for heart rate > 150', async () => {
    const result = await service.analyze({ ...base, heartRate: 160 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
  });

  it('should escalate to CRITICAL when news2Score >= 7', async () => {
    // spo2=85 → 3pts, heartRate=35 → 3pts, rr=7 → 3pts = 9 total
    const result = await service.analyze({ ...base, spo2: 85, heartRate: 35, respiratoryRate: 7 });
    expect(result.level).toBe(AlertLevel.CRITICAL);
    expect(result.news2Score).toBeGreaterThanOrEqual(7);
  });

  it('should escalate to WARNING when news2Score >= 5', async () => {
    // spo2=91 → 3pts, HR=45 → 1pt, rr=22 → 2pts = 6 total; no individual CRITICAL
    const result = await service.analyze({ ...base, spo2: 91, heartRate: 45, respiratoryRate: 22 });
    expect(result.news2Score).toBeGreaterThanOrEqual(5);
    expect(result.level).not.toBe(AlertLevel.NORMAL);
  });

  it('should apply baselineSpO2 to lower the effective warning threshold', async () => {
    // baseline=88 → effectiveThreshold=max(94,84)=94; spo2=91 is below 94 → WARNING
    const result = await service.analyze({ ...base, spo2: 91, baselineSpO2: 88 });
    expect(result.level).not.toBe(AlertLevel.NORMAL);
  });

  it('should compute NEWS2 score > 0 when SpO2 is low', () => {
    const score = service.computeNews2Score({ ...base, spo2: 85 });
    expect(score).toBeGreaterThan(0);
  });

  it('should compute NEWS2 score 0 for normal values', () => {
    const score = service.computeNews2Score(base);
    expect(score).toBe(0);
  });

  it('should publish analysis result to Redis with news2Score field', async () => {
    await service.analyze(base);
    expect(mockRedisPublisher.publish).toHaveBeenCalledWith(
      'analysis',
      expect.stringContaining('"news2Score"'),
    );
  });
});
