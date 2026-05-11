import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MeasurementsService } from './measurements.service';
import { Measurement } from './measurement.entity';
import { RedisPublisherService } from '../redis/redis-publisher.service';

const mockSession = { id: 'session-uuid', doctorId: 'doctor-uuid', patientId: 'patient-uuid' };

describe('MeasurementsService', () => {
  let service: MeasurementsService;

  const mockRepo  = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
  const mockCache = { set: jest.fn(), get: jest.fn() };
  const mockRedis = { publish: jest.fn(), get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementsService,
        { provide: getRepositoryToken(Measurement), useValue: mockRepo },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: RedisPublisherService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<MeasurementsService>(MeasurementsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should read session:doctor:<doctorId> from Redis, save and publish', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

    const dto = { spo2: 97, heartRate: 72, respiratoryRate: 16 };
    const saved = {
      ...dto, id: 'meas-uuid',
      sessionId: mockSession.id, patientId: mockSession.patientId,
      createdAt: new Date(),
    };
    mockRepo.create.mockReturnValue(saved);
    mockRepo.save.mockResolvedValue(saved);
    mockCache.set.mockResolvedValue(undefined);
    mockRedis.publish.mockResolvedValue(undefined);

    const result = await service.create(dto as any, mockSession.doctorId);

    expect(mockRedis.get).toHaveBeenCalledWith(`session:doctor:${mockSession.doctorId}`);
    expect(result).toEqual(saved);
    expect(mockRedis.publish).toHaveBeenCalledWith('measurements', JSON.stringify(saved));
  });

  it('should return null when no active session for doctor in Redis', async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await service.create({ spo2: 97, heartRate: 72, respiratoryRate: 16 } as any, mockSession.doctorId);
    expect(result).toBeNull();
  });
});
