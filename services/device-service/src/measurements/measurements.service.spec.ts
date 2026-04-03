import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MeasurementsService } from './measurements.service';
import { Measurement } from './measurement.entity';
import { MeasurementsGateway } from './measurements.gateway';
import { RedisPublisherService } from '../redis/redis-publisher.service';

describe('MeasurementsService', () => {
  let service: MeasurementsService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockCache = { set: jest.fn(), get: jest.fn() };
  const mockGateway = { broadcastMeasurement: jest.fn() };
  const mockRedis = { publish: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementsService,
        { provide: getRepositoryToken(Measurement), useValue: mockRepo },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: MeasurementsGateway, useValue: mockGateway },
        { provide: RedisPublisherService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<MeasurementsService>(MeasurementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a measurement and broadcast', async () => {
    const dto = {
      patientId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      spo2: 97,
      heartRate: 72,
      respiratoryRate: 16,
    };
    const saved = { ...dto, id: 'uuid', createdAt: new Date() };
    mockRepo.create.mockReturnValue(saved);
    mockRepo.save.mockResolvedValue(saved);
    mockCache.set.mockResolvedValue(undefined);
    mockRedis.publish.mockResolvedValue(undefined);

    const result = await service.create(dto);
    expect(result).toEqual(saved);
    expect(mockGateway.broadcastMeasurement).toHaveBeenCalledWith(saved);
    expect(mockRedis.publish).toHaveBeenCalledWith('measurements', JSON.stringify(saved));
  });
});
