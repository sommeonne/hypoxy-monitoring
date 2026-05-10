import { IsString, IsNotEmpty, IsDateString, IsNumber, IsEmail, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePatientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patronymic: string;

  @ApiProperty({ example: '1980-01-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsUUID()
  groupId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  height: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  weight: number;

  @ApiProperty({ enum: ['Male', 'Female'] })
  @IsEnum(['Male', 'Female'])
  gender: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  baselineHeartRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  baselineRespiratoryRate?: number;

  @ApiProperty({ required: false, description: 'Baseline tidal volume (mL)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  baselineTidalVolume?: number;

}
