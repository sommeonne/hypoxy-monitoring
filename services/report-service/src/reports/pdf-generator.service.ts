import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generateSessionReport(
    session: any,
    patient: any,
    measurements: any[],
    alerts: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Hypoxytherapy Session Report', { align: 'center' });
      doc.moveDown();

      // Patient info
      doc.fontSize(14).font('Helvetica-Bold').text('Patient Information');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Name: ${patient.firstName} ${patient.lastName}`);
      doc.text(`Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString()}`);
      if (patient.diagnosis) doc.text(`Diagnosis: ${patient.diagnosis}`);
      doc.moveDown();

      // Session info
      doc.fontSize(14).font('Helvetica-Bold').text('Session Details');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Session ID: ${session.id}`);
      doc.text(`Started: ${new Date(session.startedAt).toLocaleString()}`);
      if (session.endedAt)
        doc.text(`Ended: ${new Date(session.endedAt).toLocaleString()}`);
      doc.text(`Status: ${session.status}`);

      if (session.summary) {
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Duration: ${session.summary.durationMinutes} minutes`);
        doc.text(`Average SpO2: ${session.summary.avgSpo2?.toFixed(1)}%`);
        doc.text(`Average Heart Rate: ${session.summary.avgHeartRate?.toFixed(1)} bpm`);
        doc.text(
          `Average Respiratory Rate: ${session.summary.avgRespiratoryRate?.toFixed(1)} breaths/min`,
        );
        doc.text(`Minimum SpO2: ${session.summary.minSpo2?.toFixed(1)}%`);
        doc.text(`Total Measurements: ${session.summary.totalMeasurements}`);
        doc.text(`Alert Count: ${session.summary.alertCount}`);
      }

      // Measurements table
      if (measurements.length > 0) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Measurements (recent 20)');
        doc.moveDown(0.5);

        const headers = ['Time', 'SpO2 (%)', 'Heart Rate (bpm)', 'Resp. Rate'];
        const colWidths = [160, 100, 130, 100];

        doc.fontSize(10).font('Helvetica-Bold');
        let x = 50;
        const headerY = doc.y;
        headers.forEach((h, i) => {
          doc.text(h, x, headerY, { width: colWidths[i] });
          x += colWidths[i];
        });
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(9);
        measurements.slice(0, 20).forEach((m) => {
          x = 50;
          const rowY = doc.y;
          const row = [
            new Date(m.createdAt).toLocaleTimeString(),
            m.spo2.toFixed(1),
            m.heartRate.toFixed(1),
            m.respiratoryRate.toFixed(1),
          ];
          row.forEach((cell, i) => {
            doc.text(cell, x, rowY, { width: colWidths[i] });
            x += colWidths[i];
          });
          doc.moveDown(0.2);
        });
      }

      // Alerts
      if (alerts.length > 0) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Alerts During Session');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        alerts.slice(0, 50).forEach((a) => {
          doc.fillColor(a.level === 'CRITICAL' ? 'red' : 'orange');
          doc.text(
            `[${a.level}] ${new Date(a.createdAt).toLocaleString()}: ${a.message}`,
          );
          doc.fillColor('black');
        });
      }

      doc.end();
      this.logger.log(`PDF generated for session ${session.id}`);
    });
  }
}
