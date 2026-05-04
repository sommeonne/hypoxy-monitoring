import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsOptional, IsIn, IsEmail } from 'class-validator';

export class CreateUserDto {
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

  @ApiProperty({ example: 'doctor@hospital.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  unifiedNumber: string;

  @ApiPropertyOptional({ enum: ['admin', 'doctor'], default: 'doctor' })
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'doctor'])
  role?: string;
}
