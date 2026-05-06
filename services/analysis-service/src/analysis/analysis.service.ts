import { Injectable, Logger } from '@nestjs/common';
import { AlertLevel, THRESHOLDS, Measurement, AnalysisResult } from './thresholds';
import { AlertsHttpService } from './alerts-http.service';
import { RedisPublisherService } from './redis-publisher.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly alertsHttp: AlertsHttpService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  async analyze(measurement: Measurement): Promise<AnalysisResult> {
    const anomalies: string[] = [];
    let level: AlertLevel = AlertLevel.NORMAL;

    // --- SpO2 checks ---
    // For COPD-like patients whose stable SpO2 is below the standard 94% threshold,
    // lower the warning boundary to Math.max(94, baseline - 4) to avoid false alerts.
    const effectiveWarningThreshold = measurement.baselineSpO2
      ? Math.max(94, measurement.baselineSpO2 - 4)
      : THRESHOLDS.spo2.warning;

    if (measurement.spo2 < THRESHOLDS.spo2.critical) {
      anomalies.push(`SpO2 critically low: ${measurement.spo2}%`);
      level = AlertLevel.CRITICAL;
    } else if (measurement.spo2 < effectiveWarningThreshold) {
      anomalies.push(`SpO2 below warning threshold: ${measurement.spo2}%`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    } else if (measurement.spo2 > THRESHOLDS.spo2.hyperoxiaWarning) {
      anomalies.push(`SpO2 elevated (hyperoxia): ${measurement.spo2}%`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    } else if (
      measurement.spo2 > THRESHOLDS.spo2.mildHyperoxiaWarning &&
      measurement.baselineSpO2 !== undefined
    ) {
      anomalies.push(`SpO2 mildly elevated relative to patient baseline: ${measurement.spo2}%`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    }

    // --- Heart rate checks ---
    if (
      measurement.heartRate < THRESHOLDS.heartRate.criticalMin ||
      measurement.heartRate > THRESHOLDS.heartRate.criticalMax
    ) {
      anomalies.push(`Heart rate critically abnormal: ${measurement.heartRate} bpm`);
      level = AlertLevel.CRITICAL;
    } else if (
      measurement.heartRate < THRESHOLDS.heartRate.warningMin ||
      measurement.heartRate > THRESHOLDS.heartRate.warningMax
    ) {
      anomalies.push(`Heart rate abnormal: ${measurement.heartRate} bpm`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    }

    // --- Respiratory rate checks ---
    if (
      measurement.respiratoryRate < THRESHOLDS.respiratoryRate.min ||
      measurement.respiratoryRate > THRESHOLDS.respiratoryRate.max
    ) {
      anomalies.push(`Respiratory rate abnormal: ${measurement.respiratoryRate} breaths/min`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    }

    const result: AnalysisResult = {
      level,
      message:
        anomalies.length > 0
          ? anomalies.join('; ')
          : 'All parameters within normal range',
      anomalies,
      measurement,
    };

    if (level !== AlertLevel.NORMAL) {
      await this.sendAlert(result);
    }

    await this.redisPublisher.publish('analysis', JSON.stringify({
      measurementId: measurement.id,
      patientId: measurement.patientId,
      sessionId: measurement.sessionId,
      level,
    }));

    return result;
  }

  private async sendAlert(result: AnalysisResult): Promise<void> {
    try {
      await this.alertsHttp.createAlert({
        patientId: result.measurement.patientId,
        sessionId: result.measurement.sessionId,
        measurementId: result.measurement.id,
        level: result.level,
        message: result.message,
        values: {
          spo2: result.measurement.spo2,
          heartRate: result.measurement.heartRate,
          respiratoryRate: result.measurement.respiratoryRate,
        },
      });
    } catch (err) {
      this.logger.error('Failed to send alert', err);
    }
  }
}
