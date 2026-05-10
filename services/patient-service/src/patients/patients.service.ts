import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly repo: Repository<Patient>,
  ) {}

  create(dto: CreatePatientDto, doctorId: string): Promise<Patient> {
    const patient = this.repo.create({ ...dto, doctorId });
    return this.repo.save(patient);
  }

  findAll(doctorId: string): Promise<Patient[]> {
    return this.repo.find({ where: { doctorId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, doctorId?: string): Promise<Patient> {
    const patient = await this.repo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    if (doctorId && patient.doctorId !== doctorId) {
      throw new ForbiddenException('Access denied');
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, doctorId: string): Promise<Patient> {
    const patient = await this.findOne(id, doctorId);
    Object.assign(patient, dto);
    return this.repo.save(patient);
  }

  async remove(id: string, doctorId: string): Promise<void> {
    const patient = await this.findOne(id, doctorId);
    await this.repo.softRemove(patient);
  }
}
