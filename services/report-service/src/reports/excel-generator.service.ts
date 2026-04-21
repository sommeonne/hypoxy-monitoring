import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelGeneratorService {
  private readonly logger = new Logger(ExcelGeneratorService.name);

  async generateSessionReport(
    session: any,
    patient: any,
    measurements: any[],
    alerts: any[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hypoxy Monitoring System';
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 30 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.addRows([
      { field: 'Patient', value: `${patient.firstName} ${patient.lastName}` },
      { field: 'Date of Birth', value: new Date(patient.dateOfBirth).toLocaleDateString() },
      { field: 'Diagnosis', value: patient.diagnosis || 'N/A' },
      { field: 'Session ID', value: session.id },
      { field: 'Started At', value: new Date(session.startedAt).toLocaleString() },
      {
        field: 'Ended At',
        value: session.endedAt ? new Date(session.endedAt).toLocaleString() : 'Active',
      },
      { field: 'Status', value: session.status },
      { field: 'Duration (min)', value: session.summary?.durationMinutes ?? 'N/A' },
      { field: 'Average SpO2 (%)', value: session.summary?.avgSpo2?.toFixed(1) ?? 'N/A' },
      { field: 'Average Heart Rate (bpm)', value: session.summary?.avgHeartRate?.toFixed(1) ?? 'N/A' },
      { field: 'Avg Respiratory Rate', value: session.summary?.avgRespiratoryRate?.toFixed(1) ?? 'N/A' },
      { field: 'Min SpO2 (%)', value: session.summary?.minSpo2?.toFixed(1) ?? 'N/A' },
      { field: 'Total Measurements', value: session.summary?.totalMeasurements ?? measurements.length },
      { field: 'Alert Count', value: session.summary?.alertCount ?? alerts.length },
    ]);

    // Measurements sheet
    const measSheet = workbook.addWorksheet('Measurements');
    measSheet.columns = [
      { header: 'Timestamp', key: 'createdAt', width: 25 },
      { header: 'SpO2 (%)', key: 'spo2', width: 12 },
      { header: 'Heart Rate (bpm)', key: 'heartRate', width: 18 },
      { header: 'Respiratory Rate', key: 'respiratoryRate', width: 18 },
    ];
    measSheet.getRow(1).font = { bold: true };
    measurements.forEach((m) =>
      measSheet.addRow({
        createdAt: new Date(m.createdAt).toLocaleString(),
        spo2: m.spo2,
        heartRate: m.heartRate,
        respiratoryRate: m.respiratoryRate,
      }),
    );

    // Alerts sheet
    const alertSheet = workbook.addWorksheet('Alerts');
    alertSheet.columns = [
      { header: 'Timestamp', key: 'createdAt', width: 25 },
      { header: 'Level', key: 'level', width: 12 },
      { header: 'Message', key: 'message', width: 50 },
    ];
    alertSheet.getRow(1).font = { bold: true };
    alerts.forEach((a) => {
      const row = alertSheet.addRow({
        createdAt: new Date(a.createdAt).toLocaleString(),
        level: a.level,
        message: a.message,
      });
      if (a.level === 'CRITICAL') {
        row.getCell('level').font = { color: { argb: 'FFFF0000' }, bold: true };
      } else if (a.level === 'WARNING') {
        row.getCell('level').font = { color: { argb: 'FFFF8C00' }, bold: true };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Excel generated for session ${session.id}`);
    return Buffer.from(buffer);
  }
}
