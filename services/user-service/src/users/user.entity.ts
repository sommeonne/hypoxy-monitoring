import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../common/roles.enum';
import { Specialization } from '../specializations/specialization.entity';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  username: string;

  @ApiProperty()
  @Column()
  firstName: string;

  @ApiProperty()
  @Column()
  lastName: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  googleId: string;

  @ApiProperty({ enum: Role })
  @Column({ type: 'enum', enum: Role, default: Role.Doctor })
  role: Role;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, unique: true })
  email: string;

  @ApiProperty({ type: () => Specialization, nullable: true })
  @ManyToOne(() => Specialization, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn()
  specialization: Specialization | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
