import { IsUUID, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ required: false, description: 'O2 concentration percentage (8–22)', minimum: 8, maximum: 22 })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(22)
  o2Percentage?: number;

  @ApiProperty({ required: false, description: 'Planned session duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedDurationSeconds?: number;
}
