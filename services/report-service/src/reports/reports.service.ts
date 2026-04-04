import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataFetcherService } from './data-fetcher.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly dataFetcher: DataFetcherService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  async generateSessionPdf(sessionId: string): Promise<Buffer> {
    const [session, measurements] = await Promise.all([
      this.dataFetcher.getSession(sessionId),
      this.dataFetcher.getMeasurements(sessionId),
    ]);
    const [patient, alerts] = await Promise.all([
      this.dataFetcher.getPatient(session.patientId),
      this.dataFetcher.getAlertsByPatient(session.patientId),
    ]);
    return this.pdfGenerator.generateSessionReport(session, patient, measurements, alerts);
  }

  async generateSessionExcel(sessionId: string): Promise<Buffer> {
    const [session, measurements] = await Promise.all([
      this.dataFetcher.getSession(sessionId),
      this.dataFetcher.getMeasurements(sessionId),
    ]);
    const [patient, alerts] = await Promise.all([
      this.dataFetcher.getPatient(session.patientId),
      this.dataFetcher.getAlertsByPatient(session.patientId),
    ]);
    return this.excelGenerator.generateSessionReport(session, patient, measurements, alerts);
  }

  @Cron('0 8 * * *')
  async generateDailySummaries() {
    this.logger.log('Running daily summary report generation');
  }
}
