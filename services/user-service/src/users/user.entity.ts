import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ enum: ['admin', 'doctor'] })
  @Column({ default: 'doctor' })
  role: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, unique: true })
  email: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  specialization: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
