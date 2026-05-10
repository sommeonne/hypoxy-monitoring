import { IsUUID, IsEnum, IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlertLevel } from '../alert.entity';

export class CreateAlertDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  measurementId: string;

  @ApiProperty({ enum: AlertLevel })
  @IsEnum(AlertLevel)
  level: AlertLevel;

  @ApiProperty()
  @IsObject()
  values: Record<string, number>;
}
