import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

const MARGIN = 40;
const PAGE_W = 595.28;
const COL_W = PAGE_W - MARGIN * 2;
const ROW_H = 16;
const LINE_COLOR = '#000000';
const LINE_WIDTH = 0.5;

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
      const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      let y = MARGIN;

      // Title
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
        .text('HYPOXYTHERAPY SESSION REPORT', MARGIN, y);
      y += 18;
      doc.font('Helvetica').fontSize(9)
        .text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y);
      y += 20;

      // Patient
      y = this.section(doc, 'Patient Information', y);
      y = this.kvRows(doc, [
        ['Full Name',          `${patient.firstName} ${patient.lastName}`],
        ['Date of Birth',      new Date(patient.dateOfBirth).toLocaleDateString()],
        ['Height (cm)',        patient.height          != null ? String(patient.height)                   : '—'],
        ['Weight (kg)',        patient.weight          != null ? String(patient.weight)                   : '—'],
        ['Baseline HR (bpm)',  patient.baselineHeartRate        != null ? String(patient.baselineHeartRate)        : '—'],
        ['Baseline RR (/min)', patient.baselineRespiratoryRate  != null ? String(patient.baselineRespiratoryRate)  : '—'],
        ['Baseline TV (mL)',   patient.baselineTidalVolume != null ? String(patient.baselineTidalVolume) : '—'],
      ], y);
      y += 10;

      // Session
      y = this.section(doc, 'Session Details', y);
      const sessionRows: [string, string][] = [
        ['Status', session.status.toUpperCase()],
        ['Started', new Date(session.startedAt).toLocaleString()],
      ];
      if (session.endedAt)
        sessionRows.push(['Ended', new Date(session.endedAt).toLocaleString()]);
      y = this.kvRows(doc, sessionRows, y);
      y += 10;

      // Summary
      if (session.summary) {
        const critical = alerts.filter((a) => a.level === 'CRITICAL').length;
        y = this.section(doc, 'Summary Statistics', y);
        y = this.kvRows(doc, [
          ['Duration', `${session.summary.durationMinutes} min`],
          ['Total Measurements', String(session.summary.totalMeasurements ?? measurements.length)],
          ['Critical Alerts', String(critical)],
          ['Avg SpO2', `${session.summary.avgSpo2?.toFixed(1) ?? '—'}%`],
          ['Min SpO2', `${session.summary.minSpo2?.toFixed(1) ?? '—'}%`],
          ['Max SpO2', `${session.summary.maxSpo2?.toFixed(1) ?? '—'}%`],
          ['Avg Heart Rate', `${session.summary.avgHeartRate?.toFixed(1) ?? '—'} bpm`],
          ['Min Heart Rate', `${session.summary.minHeartRate?.toFixed(1) ?? '—'} bpm`],
          ['Max Heart Rate', `${session.summary.maxHeartRate?.toFixed(1) ?? '—'} bpm`],
          ['Avg Respiratory Rate', `${session.summary.avgRespiratoryRate?.toFixed(1) ?? '—'} br/min`],
          ['Min Respiratory Rate', `${session.summary.minRespiratoryRate?.toFixed(1) ?? '—'} br/min`],
          ['Max Respiratory Rate', `${session.summary.maxRespiratoryRate?.toFixed(1) ?? '—'} br/min`],
          ['Avg Tidal Volume', `${session.summary.avgTidalVolume?.toFixed(1) ?? '—'} mL`],
          ['Min Tidal Volume', `${session.summary.minTidalVolume?.toFixed(1) ?? '—'} mL`],
          ['Max Tidal Volume', `${session.summary.maxTidalVolume?.toFixed(1) ?? '—'} mL`],
          ['Conclusion', session.conclusion ?? '—'],
        ], y);
      }

      // Measurements
      if (measurements.length > 0) {
        doc.addPage();
        y = MARGIN;
        y = this.section(doc, `Measurements (${Math.min(measurements.length, 200)} of ${measurements.length})`, y);
        const mHeaders = ['#', 'Time', 'SpO2 (%)', 'Heart Rate (bpm)', 'Resp. Rate (br/min)'];
        const mCols = [30, 150, 80, 110, 125];
        y = this.tableHeader(doc, mHeaders, mCols, y);
        measurements.slice(0, 200).forEach((m, i) => {
          if (y > 790) { doc.addPage(); y = MARGIN; y = this.tableHeader(doc, mHeaders, mCols, y); }
          y = this.tableRow(doc, [
            String(i + 1),
            new Date(m.createdAt).toLocaleString(),
            m.spo2.toFixed(1),
            m.heartRate.toFixed(1),
            m.respiratoryRate.toFixed(1),
          ], mCols, y);
        });
        this.bottomBorder(doc, mCols, y);
      }

      // Alerts
      if (alerts.length > 0) {
        doc.addPage();
        y = MARGIN;
        y = this.section(doc, `Alerts (${alerts.length} total)`, y);
        const aHeaders = ['#', 'Level', 'Time', 'Message'];
        const aCols = [30, 70, 150, 265];
        y = this.tableHeader(doc, aHeaders, aCols, y);
        alerts.slice(0, 500).forEach((a, i) => {
          const cells = [
            String(i + 1),
            a.level,
            new Date(a.createdAt).toLocaleString(),
            a.message,
          ];
          const rowH = this.alertRowHeight(doc, cells, aCols);
          if (y + rowH > 790) { doc.addPage(); y = MARGIN; y = this.tableHeader(doc, aHeaders, aCols, y); }
          y = this.alertTableRow(doc, cells, aCols, y);
        });
        this.bottomBorder(doc, aCols, y);
      }

      doc.end();
      this.logger.log(`PDF generated for session ${session.id}`);
    });
  }

  private section(doc: any, title: string, y: number): number {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
      .text(title, MARGIN, y);
    y += 14;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + COL_W, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    return y + 4;
  }

  private kvRows(doc: any, rows: [string, string][], startY: number): number {
    const labelW = 160;
    const valueW = COL_W - labelW;
    const totalW = COL_W;
    let y = startY;

    // top border
    doc.moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();

    rows.forEach((row) => {
      doc.font('Helvetica').fontSize(9).fillColor('#000000')
        .text(row[0], MARGIN + 4, y + 3, { width: labelW - 8 });
      doc.font('Helvetica').fontSize(9)
        .text(row[1], MARGIN + labelW + 4, y + 3, { width: valueW - 8 });

      // divider between label and value
      doc.moveTo(MARGIN + labelW, y).lineTo(MARGIN + labelW, y + ROW_H).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();

      y += ROW_H;
      // horizontal line
      doc.moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    });

    // left + right borders
    doc.moveTo(MARGIN, startY).lineTo(MARGIN, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    doc.moveTo(MARGIN + totalW, startY).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();

    return y;
  }

  private tableHeader(doc: any, headers: string[], colW: number[], y: number): number {
    const totalW = colW.reduce((a, b) => a + b, 0);
    doc.moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    let x = MARGIN;
    headers.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
        .text(h, x + 4, y + 3, { width: colW[i] - 8, lineBreak: false });
      x += colW[i];
    });
    y += ROW_H;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    return y;
  }

  private tableRow(doc: any, cells: string[], colW: number[], y: number): number {
    const totalW = colW.reduce((a, b) => a + b, 0);
    let x = MARGIN;
    cells.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(8.5).fillColor('#000000')
        .text(cell, x + 4, y + 3, { width: colW[i] - 8, lineBreak: false });
      x += colW[i];
    });
    y += ROW_H;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    // vertical borders
    x = MARGIN;
    colW.forEach((w) => {
      doc.moveTo(x, y - ROW_H).lineTo(x, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
      x += w;
    });
    doc.moveTo(x, y - ROW_H).lineTo(x, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    return y;
  }

  private alertRowHeight(doc: any, cells: string[], colW: number[]): number {
    let maxH = ROW_H;
    cells.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(8.5);
      const h = doc.heightOfString(cell, { width: colW[i] - 8 }) + 6;
      if (h > maxH) maxH = h;
    });
    return maxH;
  }

  private alertTableRow(doc: any, cells: string[], colW: number[], y: number): number {
    const totalW = colW.reduce((a, b) => a + b, 0);
    const rowH = this.alertRowHeight(doc, cells, colW);
    let x = MARGIN;
    cells.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(8.5).fillColor('#000000')
        .text(cell, x + 4, y + 3, { width: colW[i] - 8, lineBreak: true });
      x += colW[i];
    });
    y += rowH;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    x = MARGIN;
    colW.forEach((w) => {
      doc.moveTo(x, y - rowH).lineTo(x, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
      x += w;
    });
    doc.moveTo(x, y - rowH).lineTo(x, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
    return y;
  }

  private bottomBorder(doc: any, colW: number[], y: number) {
    const totalW = colW.reduce((a, b) => a + b, 0);
    doc.moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).lineWidth(LINE_WIDTH).strokeColor(LINE_COLOR).stroke();
  }
}
