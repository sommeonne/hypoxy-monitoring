import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialization } from './specialization.entity';

@Injectable()
export class SpecializationsService {
  constructor(
    @InjectRepository(Specialization)
    private readonly repo: Repository<Specialization>,
  ) {}

  findAll(): Promise<Specialization[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(name: string): Promise<Specialization> {
    const existing = await this.repo.findOne({ where: { name } });
    if (existing) throw new ConflictException(`Specialization "${name}" already exists`);
    return this.repo.save(this.repo.create({ name }));
  }

  async remove(id: string): Promise<void> {
    const spec = await this.repo.findOne({ where: { id } });
    if (!spec) throw new NotFoundException('Specialization not found');
    await this.repo.remove(spec);
  }
}
