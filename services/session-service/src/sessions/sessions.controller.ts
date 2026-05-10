import {
  Controller, Get, Post, Put, Patch, Body, Param, ParseUUIDPipe, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { Session } from './session.entity';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('sessions')
@Controller('sessions')
@Roles(Role.Doctor)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new therapy session' })
  @ApiResponse({ status: 201, type: Session })
  create(
    @Body() dto: CreateSessionDto,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Session> {
    return this.sessionsService.create(dto, doctorId);
  }

  @Put(':id/end')
  @ApiOperation({ summary: 'End a therapy session' })
  @ApiResponse({ status: 200, type: Session })
  end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndSessionDto,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Session> {
    return this.sessionsService.end(id, dto, doctorId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({ status: 200, type: [Session] })
  findActive(@Headers('x-user-id') doctorId: string): Promise<Session[]> {
    return this.sessionsService.findActive(doctorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({ status: 200, type: Session })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Session> {
    return this.sessionsService.findOne(id, doctorId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get sessions for a patient' })
  @ApiResponse({ status: 200, type: [Session] })
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Session[]> {
    return this.sessionsService.findByPatient(patientId, doctorId);
  }

  @Patch(':id/notes')
  @ApiOperation({ summary: 'Update session notes' })
  @ApiResponse({ status: 200, type: Session })
  updateNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotesDto,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Session> {
    return this.sessionsService.updateNotes(id, dto.notes, doctorId);
  }
}
