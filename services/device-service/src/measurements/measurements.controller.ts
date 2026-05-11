import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { Measurement } from './measurement.entity';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('measurements')
@Controller('device')
@Roles(Role.Doctor)
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post('measurements')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record a new measurement from device' })
  @ApiResponse({ status: 200, type: Measurement })
  @ApiResponse({ status: 204, description: 'No active session' })
  async create(
    @Body() dto: CreateMeasurementDto,
    @Headers('x-user-id') doctorId: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.measurementsService.create(dto, doctorId);
    if (!result) {
      res.status(204).send();
    } else {
      res.status(200).json(result);
    }
  }

  @Get('measurements/:sessionId')
  @ApiOperation({ summary: 'Get all measurements for a session' })
  @ApiResponse({ status: 200, type: [Measurement] })
  findBySession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<Measurement[]> {
    return this.measurementsService.findBySession(sessionId);
  }

  @Get('stats/:sessionId')
  @ApiOperation({ summary: 'Get aggregate stats for a session' })
  getSessionStats(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.measurementsService.getSessionStats(sessionId);
  }

  @Get('latest/:patientId')
  @ApiOperation({ summary: 'Get latest measurement for a patient' })
  @ApiResponse({ status: 200, type: Measurement })
  findLatest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<Measurement | null> {
    return this.measurementsService.findLatestByPatient(patientId);
  }
}
