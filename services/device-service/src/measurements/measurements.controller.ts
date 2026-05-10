import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { Measurement } from './measurement.entity';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('measurements')
@Controller('devices')
@Roles(Role.Doctor)
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post('measurements')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record a new measurement from device' })
  @ApiResponse({ status: 200, type: Measurement })
  @ApiResponse({ status: 204, description: 'No active session — measurement dropped' })
  async create(@Body() dto: CreateMeasurementDto, @Res() res: Response): Promise<void> {
    const result = await this.measurementsService.create(dto);
    if (!result) {
      res.status(204).send();
    } else {
      res.status(200).json(result);
    }
  }

  @Get('measurements/:sessionId')
  @ApiOperation({ summary: 'Get all measurements for a session' })
  @ApiResponse({ status: 200, type: [Measurement] })
  async findBySession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Headers('x-user-id') doctorId: string,
    @Headers('x-user-role') role: string,
  ): Promise<Measurement[]> {
    await this.measurementsService.verifySessionAccess(sessionId, doctorId, role);
    return this.measurementsService.findBySession(sessionId);
  }

  @Get('latest/:patientId')
  @ApiOperation({ summary: 'Get latest measurement for a patient' })
  @ApiResponse({ status: 200, type: Measurement })
  async findLatest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Headers('x-user-id') doctorId: string,
    @Headers('x-user-role') role: string,
  ): Promise<Measurement | null> {
    await this.measurementsService.verifyPatientAccess(patientId, doctorId, role);
    return this.measurementsService.findLatestByPatient(patientId);
  }
}
