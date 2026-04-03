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

  @ApiProperty()
  @Column({ transformer: encryptTransformer })
  firstName: string;

  @ApiProperty()
  @Column({ transformer: encryptTransformer })
  lastName: string;

  @ApiProperty()
  @Column({ type: 'date' })
  dateOfBirth: Date;

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
