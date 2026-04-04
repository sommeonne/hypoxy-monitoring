import {
  Controller, Get, Post, Delete, Body, Param,
  ParseUUIDPipe, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Doctor } from './doctor.entity';

@ApiTags('doctors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all doctors (admin only)' })
  @ApiResponse({ status: 200, type: [Doctor] })
  findAll(): Promise<Doctor[]> {
    return this.doctorsService.findAll();
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a doctor account (admin only)' })
  @ApiResponse({ status: 201, type: Doctor })
  create(@Body() dto: CreateDoctorDto): Promise<Doctor> {
    return this.doctorsService.create(dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a doctor account (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.doctorsService.remove(id);
  }
}
