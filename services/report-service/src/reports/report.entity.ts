import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportType {
  PDF = 'pdf',
  EXCEL = 'excel',
  EMAIL = 'email',
}

@Entity('reports')
export class Report {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  sessionId: string;

  @ApiProperty()
  @Column()
  patientId: string;

  @ApiProperty()
  @Column()
  doctorId: string;

  @ApiProperty({ enum: ReportType })
  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  sentToEmail: string | null;

  @ApiProperty()
  @CreateDateColumn()
  generatedAt: Date;
}
