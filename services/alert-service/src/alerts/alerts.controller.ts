import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, Headers } from '@nestjs/common';
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
  async findAll(
    @Headers('x-user-id') doctorId: string,
    @Headers('x-user-role') role: string,
    @Query('patientId') patientId?: string,
    @Query('sessionId') sessionId?: string,
  ): Promise<Alert[]> {
    if (sessionId) {
      await this.alertsService.verifySessionAccess(sessionId, doctorId, role);
    } else if (patientId) {
      await this.alertsService.verifyPatientAccess(patientId, doctorId, role);
    }
    return this.alertsService.findAll(patientId, sessionId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get alerts for a patient' })
  @ApiResponse({ status: 200, type: [Alert] })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Headers('x-user-id') doctorId: string,
    @Headers('x-user-role') role: string,
  ): Promise<Alert[]> {
    await this.alertsService.verifyPatientAccess(patientId, doctorId, role);
    return this.alertsService.findByPatient(patientId);
  }
}
