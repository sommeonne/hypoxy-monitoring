import {
  Controller, Get, Post, Put, Body, Param, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { Session } from './session.entity';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new therapy session' })
  @ApiResponse({ status: 201, type: Session })
  create(@Body() dto: CreateSessionDto): Promise<Session> {
    return this.sessionsService.create(dto);
  }

  @Put(':id/end')
  @ApiOperation({ summary: 'End a therapy session' })
  @ApiResponse({ status: 200, type: Session })
  end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndSessionDto,
  ): Promise<Session> {
    return this.sessionsService.end(id, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({ status: 200, type: [Session] })
  findActive(): Promise<Session[]> {
    return this.sessionsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({ status: 200, type: Session })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Session> {
    return this.sessionsService.findOne(id);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get sessions for a patient' })
  @ApiResponse({ status: 200, type: [Session] })
  findByPatient(@Param('patientId', ParseUUIDPipe) patientId: string): Promise<Session[]> {
    return this.sessionsService.findByPatient(patientId);
  }
}
