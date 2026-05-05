import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly repo: Repository<Group>,
  ) {}

  findAll(): Promise<Group[]> {
    return this.repo.find({ order: { number: 'ASC' } });
  }

  async create(number: number): Promise<Group> {
    const existing = await this.repo.findOne({ where: { number } });
    if (existing) throw new ConflictException(`Group ${number} already exists`);
    return this.repo.save(this.repo.create({ number }));
  }

  async remove(id: string): Promise<void> {
    const group = await this.repo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    await this.repo.delete({ id });
  }
}
