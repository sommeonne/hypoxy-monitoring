import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { Measurement } from './measurement.entity';

@ApiTags('measurements')
@Controller('devices')
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post('measurements')
  @ApiOperation({ summary: 'Record a new measurement from device' })
  @ApiResponse({ status: 201, type: Measurement })
  create(@Body() dto: CreateMeasurementDto): Promise<Measurement> {
    return this.measurementsService.create(dto);
  }

  @Get('measurements/:sessionId')
  @ApiOperation({ summary: 'Get all measurements for a session' })
  @ApiResponse({ status: 200, type: [Measurement] })
  findBySession(@Param('sessionId', ParseUUIDPipe) sessionId: string): Promise<Measurement[]> {
    return this.measurementsService.findBySession(sessionId);
  }

  @Get('latest/:patientId')
  @ApiOperation({ summary: 'Get latest measurement for a patient' })
  @ApiResponse({ status: 200, type: Measurement })
  findLatest(@Param('patientId', ParseUUIDPipe) patientId: string): Promise<Measurement | null> {
    return this.measurementsService.findLatestByPatient(patientId);
  }
}
