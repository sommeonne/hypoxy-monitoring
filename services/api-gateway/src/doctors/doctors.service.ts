import { Injectable, OnModuleInit, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Doctor } from './doctor.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';

@Injectable()
export class DoctorsService implements OnModuleInit {
  constructor(
    @InjectRepository(Doctor)
    private readonly repo: Repository<Doctor>,
  ) {}

  /** Seed a default admin on first run */
  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await this.repo.save(
        this.repo.create({
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          passwordHash,
          role: 'admin',
        }),
      );
    }
  }

  findByUsername(username: string): Promise<Doctor | null> {
    return this.repo.findOne({ where: { username } });
  }

  findAll(): Promise<Doctor[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string): Promise<Doctor | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(dto: CreateDoctorDto): Promise<Doctor> {
    const existing = await this.repo.findOne({ where: { username: dto.username } });
    if (existing) throw new ConflictException(`Username "${dto.username}" is already taken`);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const doctor = this.repo.create({
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      email: dto.email,
      unifiedNumber: dto.unifiedNumber,
      role: dto.role ?? 'doctor',
    });
    return this.repo.save(doctor);
  }

  async remove(id: string): Promise<void> {
    const doctor = await this.repo.findOne({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    await this.repo.remove(doctor);
  }
}
