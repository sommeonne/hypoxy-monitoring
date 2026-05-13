import { Injectable, OnModuleInit, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Specialization } from '../specializations/specialization.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../common/roles.enum';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(Specialization)
    private readonly specRepo: Repository<Specialization>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (!adminEmail) return;

    const existing = await this.repo.findOne({ where: { email: adminEmail } });
    if (!existing) {
      await this.repo.save(
        this.repo.create({
          username: adminEmail.split('@')[0],
          firstName: 'Admin',
          lastName: '',
          email: adminEmail,
          role: Role.Admin,
        }),
      );
    }
  }

  findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findOrCreateByGoogle(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<User | null> {
    let user = await this.repo.findOne({ where: { googleId: profile.googleId } });
    if (user) return user;

    user = await this.repo.findOne({ where: { email: profile.email } });
    if (!user) return null;

    user.googleId = profile.googleId;
    if (!user.firstName) user.firstName = profile.firstName;
    if (!user.lastName) user.lastName = profile.lastName;
    return this.repo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existingEmail = await this.repo.findOne({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException(`Email "${dto.email}" is already registered`);

    let specialization: Specialization | null = null;
    if (dto.specializationId) {
      specialization = await this.specRepo.findOne({ where: { id: dto.specializationId } });
      if (!specialization) throw new NotFoundException('Specialization not found');
    }

    const user = this.repo.create({
      username: dto.email.split('@')[0],
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      specialization,
      role: dto.role ?? Role.Doctor,
    });
    return this.repo.save(user);
  }

  async update(
    id: string,
    dto: { firstName?: string; lastName?: string; email?: string; specializationId?: string | null },
  ): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const { specializationId, ...rest } = dto;
    Object.assign(user, rest);

    if (specializationId !== undefined) {
      if (specializationId === null) {
        user.specialization = null;
      } else {
        const spec = await this.specRepo.findOne({ where: { id: specializationId } });
        if (!spec) throw new NotFoundException('Specialization not found');
        user.specialization = spec;
      }
    }

    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.repo.remove(user);
  }
}