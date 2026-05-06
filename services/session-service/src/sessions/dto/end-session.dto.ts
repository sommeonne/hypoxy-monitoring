import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EndSessionDto {
  @ApiProperty({ required: false, description: 'Number of alerts during session' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  alertCount?: number;

  @ApiProperty({ required: false, description: 'Average SpO2 during session' })
  @IsOptional()
  @IsNumber()
  avgSpo2?: number;

  @ApiProperty({ required: false, description: 'Average heart rate' })
  @IsOptional()
  @IsNumber()
  avgHeartRate?: number;

  @ApiProperty({ required: false, description: 'Average respiratory rate' })
  @IsOptional()
  @IsNumber()
  avgRespiratoryRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minSpo2?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxHeartRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalMeasurements?: number;

  @ApiProperty({ required: false, description: 'Hypoxia tolerance conclusion' })
  @IsOptional()
  conclusion?: string;
}
