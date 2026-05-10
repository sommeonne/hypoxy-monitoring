import {
  Controller, Get, Post, Put, Delete,
  Body, Param, ParseUUIDPipe, HttpCode, HttpStatus, Headers, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Patient } from './patient.entity';

@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  private requireDoctor(role: string): void {
    if (role !== 'doctor') throw new ForbiddenException('Access restricted to doctors');
  }

  @Post()
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiResponse({ status: 201, type: Patient })
  create(
    @Body() dto: CreatePatientDto,
    @Headers('x-user-id') doctorId: string,
    @Headers('x-user-role') role: string,
  ): Promise<Patient> {
    this.requireDoctor(role);
    return this.patientsService.create(dto, doctorId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all patients' })
  @ApiResponse({ status: 200, type: [Patient] })
  findAll(
    @Headers('x-user-role') role: string,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Patient[]> {
    this.requireDoctor(role);
    return this.patientsService.findAll(doctorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a patient by ID' })
  @ApiResponse({ status: 200, type: Patient })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Patient> {
    this.requireDoctor(role);
    return this.patientsService.findOne(id, doctorId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update patient data' })
  @ApiResponse({ status: 200, type: Patient })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @Headers('x-user-role') role: string,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Patient> {
    this.requireDoctor(role);
    return this.patientsService.update(id, dto, doctorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a patient' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-role') role: string,
    @Headers('x-user-id') doctorId: string,
  ): Promise<void> {
    this.requireDoctor(role);
    return this.patientsService.remove(id, doctorId);
  }
}
