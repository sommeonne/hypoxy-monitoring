import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataFetcherService } from './data-fetcher.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { EmailService } from './email.service';
import { Report, ReportType } from './report.entity';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    private readonly dataFetcher: DataFetcherService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
    private readonly emailService: EmailService,
  ) {}

  private async fetchAndAuthorize(sessionId: string, doctorId: string) {
    const session = await this.dataFetcher.getSession(sessionId);
    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Access denied');
    }
    return session;
  }

  async generateSessionPdf(sessionId: string, doctorId: string): Promise<Buffer> {
    const session = await this.fetchAndAuthorize(sessionId, doctorId);
    const [measurements, alerts] = await Promise.all([
      this.dataFetcher.getMeasurements(sessionId),
      this.dataFetcher.getAlertsBySession(sessionId),
    ]);
    const patient = await this.dataFetcher.getPatient(session.patientId);
    const buffer = await this.pdfGenerator.generateSessionReport(session, patient, measurements, alerts);

    await this.reportRepo.save(this.reportRepo.create({
      sessionId,
      patientId: session.patientId,
      doctorId,
      type: ReportType.PDF,
      sentToEmail: null,
    }));

    return buffer;
  }

  async generateSessionExcel(sessionId: string, doctorId: string): Promise<Buffer> {
    const session = await this.fetchAndAuthorize(sessionId, doctorId);
    const [measurements, alerts] = await Promise.all([
      this.dataFetcher.getMeasurements(sessionId),
      this.dataFetcher.getAlertsBySession(sessionId),
    ]);
    const patient = await this.dataFetcher.getPatient(session.patientId);
    const buffer = await this.excelGenerator.generateSessionReport(session, patient, measurements, alerts);

    await this.reportRepo.save(this.reportRepo.create({
      sessionId,
      patientId: session.patientId,
      doctorId,
      type: ReportType.EXCEL,
      sentToEmail: null,
    }));

    return buffer;
  }

  async sendSessionReportEmail(sessionId: string, doctorId: string): Promise<void> {
    const session = await this.fetchAndAuthorize(sessionId, doctorId);
    const [measurements, alerts] = await Promise.all([
      this.dataFetcher.getMeasurements(sessionId),
      this.dataFetcher.getAlertsBySession(sessionId),
    ]);
    const patient = await this.dataFetcher.getPatient(session.patientId);

    if (!patient.email) {
      throw new BadRequestException('Patient does not have an email address on file');
    }

    const pdfBuffer = await this.pdfGenerator.generateSessionReport(
      session, patient, measurements, alerts,
    );

    await this.emailService.sendSessionReport(
      patient.email,
      `${patient.firstName} ${patient.lastName}`,
      new Date(session.startedAt),
      pdfBuffer,
      sessionId,
      session.conclusion,
    );

    await this.reportRepo.save(this.reportRepo.create({
      sessionId,
      patientId: session.patientId,
      doctorId,
      type: ReportType.EMAIL,
      sentToEmail: patient.email,
    }));
  }

  async getSessionReports(sessionId: string, doctorId: string): Promise<Report[]> {
    const session = await this.dataFetcher.getSession(sessionId);
    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Access denied');
    }
    return this.reportRepo.find({
      where: { sessionId },
      order: { generatedAt: 'DESC' },
    });
  }

}
