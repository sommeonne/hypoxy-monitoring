import { Controller, Get, Post, Put, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
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
  @ApiQuery({ name: 'acknowledged', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [Alert] })
  findAll(
    @Query('patientId') patientId?: string,
    @Query('acknowledged') acknowledged?: string,
  ): Promise<Alert[]> {
    const ack = acknowledged !== undefined ? acknowledged === 'true' : undefined;
    return this.alertsService.findAll(patientId, ack);
  }

  @Get('unacknowledged')
  @ApiOperation({ summary: 'Get all unacknowledged alerts' })
  @ApiResponse({ status: 200, type: [Alert] })
  findUnacknowledged(): Promise<Alert[]> {
    return this.alertsService.findUnacknowledged();
  }

  @Put(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ status: 200, type: Alert })
  acknowledge(@Param('id', ParseUUIDPipe) id: string): Promise<Alert> {
    return this.alertsService.acknowledge(id);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get alerts for a patient' })
  @ApiResponse({ status: 200, type: [Alert] })
  findByPatient(@Param('patientId', ParseUUIDPipe) patientId: string): Promise<Alert[]> {
    return this.alertsService.findByPatient(patientId);
  }
}
