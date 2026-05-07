import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('measurements')
export class Measurement {
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
  @Column('float')
  spo2: number;

  @ApiProperty()
  @Column('float')
  heartRate: number;

  @ApiProperty()
  @Column('float')
  respiratoryRate: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'float', nullable: true })
  o2Percentage: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'float', nullable: true })
  tidalVolume: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
