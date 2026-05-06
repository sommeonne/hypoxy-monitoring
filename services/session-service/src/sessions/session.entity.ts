import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface SessionSummary {
  avgSpo2: number;
  avgHeartRate: number;
  avgRespiratoryRate: number;
  minSpo2: number;
  maxHeartRate: number;
  durationMinutes: number;
  totalMeasurements: number;
  alertCount: number;
}

@Entity('sessions')
export class Session {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  patientId: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  doctorId: string;

  @ApiProperty()
  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date;

  @ApiProperty({ enum: SessionStatus })
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @ApiProperty({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  summary: SessionSummary;

  @ApiProperty({ nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'float', nullable: true })
  o2Percentage: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'int', nullable: true })
  plannedDurationSeconds: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'text', nullable: true })
  conclusion: string;

  @CreateDateColumn()
  createdAt: Date;
}
