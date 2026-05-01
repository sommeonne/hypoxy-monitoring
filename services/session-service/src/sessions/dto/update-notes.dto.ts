import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateNotesDto {
  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
