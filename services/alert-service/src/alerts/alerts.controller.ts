import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { Alert } from './alert.entity';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('alerts')
@Controller('alerts')
@Roles(Role.Doctor)
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
    @Query('patientId') patientId?: string,
    @Query('sessionId') sessionId?: string,
  ): Promise<Alert[]> {
    return this.alertsService.findAll(patientId, sessionId);
  }

  @Get('count/:sessionId')
  @ApiOperation({ summary: 'Get alert count for a session' })
  countBySession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<{ count: number }> {
    return this.alertsService.countBySession(sessionId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get alerts for a patient' })
  @ApiResponse({ status: 200, type: [Alert] })
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<Alert[]> {
    return this.alertsService.findByPatient(patientId);
  }
}
