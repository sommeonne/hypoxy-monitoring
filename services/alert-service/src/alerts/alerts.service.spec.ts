import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { Alert, AlertLevel } from './alert.entity';
import { RedisPublisherService } from '../redis/redis-publisher.service';

describe('AlertsService', () => {
  let service: AlertsService;
  const mockRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
  const mockRedis = { publish: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alert), useValue: mockRepo },
        { provide: RedisPublisherService, useValue: mockRedis },
      ],
    }).compile();
    service = module.get<AlertsService>(AlertsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should create alert and publish to redis', async () => {
    const dto = {
      patientId: 'p-uuid',
      sessionId: 's-uuid',
      measurementId: 'm-uuid',
      level: AlertLevel.CRITICAL,
      values: { spo2: 85 },
    };
    const alert = { ...dto, id: 'a-uuid', createdAt: new Date() };
    mockRepo.create.mockReturnValue(alert);
    mockRepo.save.mockResolvedValue(alert);
    const result = await service.create(dto);
    expect(result).toEqual(alert);
    expect(mockRedis.publish).toHaveBeenCalledWith('alerts', JSON.stringify(alert));
  });
});
