import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsEmail, IsUUID, IsEnum } from 'class-validator';
import { Role } from '../../common/roles.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'doctor@hospital.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'uuid-of-specialization' })
  @IsOptional()
  @IsUUID()
  specializationId?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.Doctor })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
