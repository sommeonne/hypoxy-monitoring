import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { encryptTransformer } from '../common/crypto.transformer';

@Entity('patients')
export class Patient {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  cardNumber: string;

  @ApiProperty()
  @Column({ transformer: encryptTransformer })
  firstName: string;

  @ApiProperty()
  @Column({ transformer: encryptTransformer })
  lastName: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, transformer: encryptTransformer })
  patronymic: string;

  @ApiProperty()
  @Column({ type: 'date' })
  dateOfBirth: Date;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  group: number;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  height: number;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, type: 'float' })
  weight: number;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  gender: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, transformer: encryptTransformer })
  address: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, transformer: encryptTransformer })
  phone: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, transformer: encryptTransformer })
  email: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, transformer: encryptTransformer })
  diagnosis: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  notes: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
