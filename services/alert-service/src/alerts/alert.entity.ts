import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AlertLevel {
  CRITICAL = 'CRITICAL',
}

@Entity('alerts')
export class Alert {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  patientId: string;

  @ApiProperty()
  @Column()
  sessionId: string;

  @ApiProperty()
  @Column()
  measurementId: string;

  @ApiProperty({ enum: AlertLevel })
  @Column({ type: 'enum', enum: AlertLevel })
  level: AlertLevel;

  @ApiProperty()
  @Column({ type: 'jsonb' })
  values: Record<string, number>;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
