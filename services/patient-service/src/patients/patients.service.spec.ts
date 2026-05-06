import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Patient } from './patient.entity';

describe('PatientsService', () => {
  let service: PatientsService;
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: getRepositoryToken(Patient), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should create a patient', async () => {
    const dto = { firstName: 'John', lastName: 'Doe', dateOfBirth: '1980-01-01' };
    const patient = { ...dto, id: 'uuid', createdAt: new Date(), updatedAt: new Date() };
    mockRepo.create.mockReturnValue(patient);
    mockRepo.save.mockResolvedValue(patient);
    const result = await service.create(dto as any, 'doctor-1');
    expect(result).toEqual(patient);
  });

  it('should throw NotFoundException for unknown patient', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('unknown-id')).rejects.toThrow(NotFoundException);
  });
});
