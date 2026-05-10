import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeasurementDto {
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

  @ApiProperty({ description: 'Inhaled O₂ concentration %', minimum: 8, maximum: 22, required: false })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(22)
  o2Percentage?: number;

  @ApiProperty({ description: 'Tidal volume in mL', minimum: 200, maximum: 1500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(200)
  @Max(1500)
  tidalVolume?: number;
}
