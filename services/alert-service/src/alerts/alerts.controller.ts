import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { Alert } from './alert.entity';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new alert' })
  @ApiResponse({ status: 201, type: Alert })
  create(@Body() dto: CreateAlertDto): Promise<Alert> {
    return this.alertsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all alerts with optional filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({ status: 200, type: [Alert] })
  findAll(
    @Headers('x-user-role') role: string,
    @Query('patientId') patientId?: string,
    @Query('sessionId') sessionId?: string,
  ): Promise<Alert[]> {
    if (role === 'admin') throw new ForbiddenException('Access to alerts is restricted to doctors');
    return this.alertsService.findAll(patientId, sessionId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get alerts for a patient' })
  @ApiResponse({ status: 200, type: [Alert] })
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Headers('x-user-role') role: string,
  ): Promise<Alert[]> {
    if (role === 'admin') throw new ForbiddenException('Access to alerts is restricted to doctors');
    return this.alertsService.findByPatient(patientId);
  }
}
