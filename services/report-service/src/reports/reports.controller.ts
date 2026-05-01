import {
  Controller, Get, Post, Param, ParseUUIDPipe, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('session/:id/pdf')
  @ApiOperation({ summary: 'Generate PDF report for a session' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  async getSessionPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateSessionPdf(id);
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
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateSessionExcel(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="session-${id}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('session/:id/email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send session PDF report to patient email' })
  @ApiResponse({ status: 204, description: 'Email sent successfully' })
  async sendSessionEmail(@Param('id', ParseUUIDPipe) id: string) {
    await this.reportsService.sendSessionReportEmail(id);
  }
}
