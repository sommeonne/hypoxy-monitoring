import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { Session, SessionStatus } from './session.entity';
import { RedisPublisherService } from '../redis/redis-publisher.service';

describe('SessionsService', () => {
  let service: SessionsService;
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockRedis = {
    publish: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  const mockConfig = { get: jest.fn().mockReturnValue('http://localhost') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(Session), useValue: mockRepo },
        { provide: RedisPublisherService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<SessionsService>(SessionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should create a session with ACTIVE status', async () => {
    const dto = { patientId: '123e4567-e89b-12d3-a456-426614174000' };
    const session = { ...dto, id: 'uuid', status: SessionStatus.ACTIVE, startedAt: new Date() };
    mockRepo.create.mockReturnValue(session);
    mockRepo.save.mockResolvedValue(session);
    const result = await service.create(dto, 'doctor-1');
    expect(result.status).toBe(SessionStatus.ACTIVE);
  });

  it('should throw when ending non-existent session', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.end('bad-id')).rejects.toThrow(NotFoundException);
  });

  it('should throw when ending non-active session', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'uuid', status: SessionStatus.COMPLETED, startedAt: new Date() });
    await expect(service.end('uuid')).rejects.toThrow(BadRequestException);
  });
});
