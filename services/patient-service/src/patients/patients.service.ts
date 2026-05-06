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

  findAll(role: string, doctorId: string): Promise<Patient[]> {
    const where = role === 'admin' ? {} : { doctorId };
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, role?: string, doctorId?: string): Promise<Patient> {
    const patient = await this.repo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    if (role === 'doctor' && patient.doctorId !== doctorId) {
      throw new ForbiddenException('Access denied');
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, role: string, doctorId: string): Promise<Patient> {
    const patient = await this.findOne(id, role, doctorId);
    Object.assign(patient, dto);
    return this.repo.save(patient);
  }

  async remove(id: string, role: string, doctorId: string): Promise<void> {
    const patient = await this.findOne(id, role, doctorId);
    await this.repo.softRemove(patient);
  }
}
