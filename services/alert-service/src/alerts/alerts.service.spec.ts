import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { Alert, AlertLevel } from './alert.entity';
import { AlertsGateway } from './alerts.gateway';

describe('AlertsService', () => {
  let service: AlertsService;
  const mockRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
  const mockGateway = { broadcastAlert: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alert), useValue: mockRepo },
        { provide: AlertsGateway, useValue: mockGateway },
      ],
    }).compile();
    service = module.get<AlertsService>(AlertsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should create alert and broadcast', async () => {
    const dto = {
      patientId: 'p-uuid',
      sessionId: 's-uuid',
      measurementId: 'm-uuid',
      level: AlertLevel.CRITICAL,
      message: 'SpO2 critically low',
      values: { spo2: 85 },
    };
    const alert = { ...dto, id: 'a-uuid', createdAt: new Date() };
    mockRepo.create.mockReturnValue(alert);
    mockRepo.save.mockResolvedValue(alert);
    const result = await service.create(dto);
    expect(result).toEqual(alert);
    expect(mockGateway.broadcastAlert).toHaveBeenCalledWith(alert);
  });

});
