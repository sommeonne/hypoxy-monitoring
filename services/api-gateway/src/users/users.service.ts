import { Injectable, OnModuleInit, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
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

  findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findOne({ where: { username: dto.username } });
    if (existing) throw new ConflictException(`Username "${dto.username}" is already taken`);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      email: dto.email,
      unifiedNumber: dto.unifiedNumber,
      role: dto.role ?? 'doctor',
    });
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.repo.remove(user);
  }
}
