import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { AlertLevel, Measurement } from './thresholds';
import { AlertsHttpService } from './alerts-http.service';

describe('AnalysisService', () => {
  let service: AnalysisService;
  const mockAlertsHttp = { createAlert: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: AlertsHttpService, useValue: mockAlertsHttp },
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

  it('should return WARNING for high heart rate', async () => {
    const result = await service.analyze({ ...base, heartRate: 120 });
    expect(result.level).toBe(AlertLevel.WARNING);
    expect(result.anomalies.some((a) => a.includes('Heart rate too high'))).toBe(true);
  });

  it('should compute hypoxia index > 0 when SpO2 is low', () => {
    const index = service.computeHypoxiaIndex({ ...base, spo2: 85 });
    expect(index).toBeGreaterThan(0);
  });

  it('should compute hypoxia index 0 for normal values', () => {
    const index = service.computeHypoxiaIndex(base);
    expect(index).toBe(0);
  });
});
