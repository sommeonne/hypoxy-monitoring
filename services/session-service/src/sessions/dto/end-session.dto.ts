import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EndSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  alertCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalMeasurements?: number;

  // ── SpO2 ──────────────────────────────────────────────────────────────────
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  avgSpo2?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minSpo2?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxSpo2?: number;

  // ── Heart Rate ─────────────────────────────────────────────────────────────
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  avgHeartRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minHeartRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxHeartRate?: number;

  // ── Respiratory Rate ───────────────────────────────────────────────────────
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  avgRespiratoryRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minRespiratoryRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxRespiratoryRate?: number;

  // ── Tidal Volume ───────────────────────────────────────────────────────────
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  avgTidalVolume?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minTidalVolume?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxTidalVolume?: number;

  // ── Conclusion ─────────────────────────────────────────────────────────────
  @ApiProperty({ required: false, description: 'Hypoxia tolerance conclusion' })
  @IsOptional()
  @IsString()
  conclusion?: string;
}
