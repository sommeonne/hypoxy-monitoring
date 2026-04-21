import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
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
  @ApiResponse({ status: 200, type: [Alert] })
  findAll(@Query('patientId') patientId?: string): Promise<Alert[]> {
    return this.alertsService.findAll(patientId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get alerts for a patient' })
  @ApiResponse({ status: 200, type: [Alert] })
  findByPatient(@Param('patientId', ParseUUIDPipe) patientId: string): Promise<Alert[]> {
    return this.alertsService.findByPatient(patientId);
  }
}
