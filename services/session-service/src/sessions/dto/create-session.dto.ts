import { IsUUID, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ required: false, description: 'O2 concentration percentage (10–20)', minimum: 10, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(20)
  o2Percentage?: number;

  @ApiProperty({ required: false, description: 'Planned session duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedDurationSeconds?: number;
}
