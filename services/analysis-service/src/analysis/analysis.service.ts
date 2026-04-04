import { Injectable, Logger } from '@nestjs/common';
import { AlertLevel, THRESHOLDS, Measurement, AnalysisResult } from './thresholds';
import { AlertsHttpService } from './alerts-http.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly slidingWindow = new Map<string, number[]>();

  constructor(private readonly alertsHttp: AlertsHttpService) {}

  async analyze(measurement: Measurement): Promise<AnalysisResult> {
    const anomalies: string[] = [];
    let level: AlertLevel = AlertLevel.NORMAL;

    if (measurement.spo2 < THRESHOLDS.spo2.critical) {
      anomalies.push(`SpO2 critically low: ${measurement.spo2}%`);
      level = AlertLevel.CRITICAL;
    } else if (measurement.spo2 < THRESHOLDS.spo2.warning) {
      anomalies.push(`SpO2 below warning threshold: ${measurement.spo2}%`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    }

    if (measurement.heartRate < THRESHOLDS.heartRate.min) {
      anomalies.push(`Heart rate too low: ${measurement.heartRate} bpm`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    } else if (measurement.heartRate > THRESHOLDS.heartRate.max) {
      anomalies.push(`Heart rate too high: ${measurement.heartRate} bpm`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    }

    if (measurement.respiratoryRate < THRESHOLDS.respiratoryRate.min) {
      anomalies.push(`Respiratory rate too low: ${measurement.respiratoryRate}`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    } else if (measurement.respiratoryRate > THRESHOLDS.respiratoryRate.max) {
      anomalies.push(`Respiratory rate too high: ${measurement.respiratoryRate}`);
      if ((level as AlertLevel) !== AlertLevel.CRITICAL) level = AlertLevel.WARNING;
    }

    const windowAnomaly = this.detectSlidingWindowAnomaly(measurement);
    if (windowAnomaly) {
      anomalies.push(windowAnomaly);
      if (level === AlertLevel.NORMAL) level = AlertLevel.WARNING;
    }

    const hypoxiaIndex = this.computeHypoxiaIndex(measurement);

    const result: AnalysisResult = {
      level,
      message:
        anomalies.length > 0
          ? anomalies.join('; ')
          : 'All parameters within normal range',
      hypoxiaIndex,
      anomalies,
      measurement,
    };

    if (level !== AlertLevel.NORMAL) {
      await this.sendAlert(result);
    }

    return result;
  }

  private detectSlidingWindowAnomaly(measurement: Measurement): string | null {
    const key = measurement.patientId;
    const window = this.slidingWindow.get(key) ?? [];
    window.push(measurement.spo2);
    if (window.length > 5) window.shift();
    this.slidingWindow.set(key, window);

    if (window.length < 3) return null;

    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const stdDev = Math.sqrt(
      window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window.length,
    );

    if (stdDev > 5) {
      return `High SpO2 variability detected (std dev: ${stdDev.toFixed(2)})`;
    }
    return null;
  }

  computeHypoxiaIndex(measurement: Measurement): number {
    const spo2Dev = Math.max(0, 100 - measurement.spo2) / 10;
    const hrDev =
      measurement.heartRate < THRESHOLDS.heartRate.min
        ? (THRESHOLDS.heartRate.min - measurement.heartRate) / THRESHOLDS.heartRate.min
        : measurement.heartRate > THRESHOLDS.heartRate.max
        ? (measurement.heartRate - THRESHOLDS.heartRate.max) / THRESHOLDS.heartRate.max
        : 0;
    const rrDev =
      measurement.respiratoryRate < THRESHOLDS.respiratoryRate.min
        ? (THRESHOLDS.respiratoryRate.min - measurement.respiratoryRate) /
          THRESHOLDS.respiratoryRate.min
        : measurement.respiratoryRate > THRESHOLDS.respiratoryRate.max
        ? (measurement.respiratoryRate - THRESHOLDS.respiratoryRate.max) /
          THRESHOLDS.respiratoryRate.max
        : 0;

    return Math.min(
      10,
      parseFloat((spo2Dev * 0.6 + hrDev * 0.25 + rrDev * 0.15).toFixed(2)),
    );
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
          hypoxiaIndex: result.hypoxiaIndex,
        },
      });
    } catch (err) {
      this.logger.error('Failed to send alert', err);
    }
  }
}
