import { IsUUID, IsNumber, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeasurementDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Session UUID' })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'SpO2 percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  spo2: number;

  @ApiProperty({ description: 'Heart rate bpm', minimum: 0, maximum: 300 })
  @IsNumber()
  @Min(0)
  @Max(300)
  heartRate: number;

  @ApiProperty({ description: 'Respiratory rate breaths/min', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  respiratoryRate: number;

  @ApiProperty({ description: 'Inhaled O₂ concentration %', minimum: 10, maximum: 21, required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(21)
  o2Percentage?: number;
}
