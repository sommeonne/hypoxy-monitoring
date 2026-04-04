import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsOptional, IsIn } from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({ example: 'jsmith' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: ['admin', 'doctor'], default: 'doctor' })
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'doctor'])
  role?: string;
}
