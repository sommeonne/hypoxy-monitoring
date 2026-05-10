import {
  Controller, Get, Post, Param, ParseUUIDPipe, Res, HttpCode, HttpStatus, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Report } from './report.entity';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('reports')
@Controller('reports')
@Roles(Role.Doctor)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('session/:id/pdf')
  @ApiOperation({ summary: 'Generate PDF report for a session' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  async getSessionPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') doctorId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateSessionPdf(id, doctorId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="session-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('session/:id/excel')
  @ApiOperation({ summary: 'Generate Excel report for a session' })
  @ApiResponse({ status: 200, description: 'Excel file' })
  async getSessionExcel(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') doctorId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateSessionExcel(id, doctorId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="session-${id}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('session/:id/email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send session PDF report to patient email' })
  @ApiResponse({ status: 204, description: 'Email sent successfully' })
  async sendSessionEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') doctorId: string,
  ) {
    await this.reportsService.sendSessionReportEmail(id, doctorId);
  }

  @Get('session/:id')
  @ApiOperation({ summary: 'Get report history for a session' })
  @ApiResponse({ status: 200, type: [Report] })
  async getSessionReports(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') doctorId: string,
  ): Promise<Report[]> {
    return this.reportsService.getSessionReports(id, doctorId);
  }
}
