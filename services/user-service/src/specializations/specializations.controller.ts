import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { SpecializationsService } from './specializations.service';
import { Specialization } from './specialization.entity';

class CreateSpecializationDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@ApiTags('specializations')
@Controller('specializations')
export class SpecializationsController {
  constructor(private readonly service: SpecializationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all specializations' })
  findAll(): Promise<Specialization[]> {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a specialization' })
  create(@Body() dto: CreateSpecializationDto): Promise<Specialization> {
    return this.service.create(dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specialization' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
