import { Injectable, Logger } from '@nestjs/common';
import { AlertLevel, THRESHOLDS, Measurement, AnalysisResult } from './thresholds';
import { AlertsHttpService } from './alerts-http.service';
import { RedisPublisherService } from './redis-publisher.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly slidingWindow = new Map<string, number[]>();

  constructor(
    private readonly alertsHttp: AlertsHttpService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

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

    await this.redisPublisher.publish('analysis', JSON.stringify({
      measurementId: measurement.id,
      patientId: measurement.patientId,
      sessionId: measurement.sessionId,
      hypoxiaIndex,
      level,
    }));

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
    const spo2Score = this.scoreSpo2(measurement.spo2);
    const hrScore = this.scoreHeartRate(measurement.heartRate);
    const rrScore = this.scoreRespRate(measurement.respiratoryRate);
    return Math.min(
      10,
      parseFloat((spo2Score * 0.6 + hrScore * 0.25 + rrScore * 0.15).toFixed(2)),
    );
  }

  private scoreSpo2(v: number): number {
    if (v >= 94) return 0;
    if (v >= 90) return ((94 - v) / 4) * 5;
    if (v >= 85) return 5 + ((90 - v) / 5) * 3;
    return Math.min(10, 8 + ((85 - v) / 5) * 2);
  }

  private scoreHeartRate(v: number): number {
    if (v >= 60 && v <= 100) return 0;
    if (v >= 50) return ((60 - v) / 10) * 5;
    if (v <= 120) return ((v - 100) / 20) * 5;
    if (v < 50) return Math.min(10, 5 + ((50 - v) / 20) * 5);
    return Math.min(10, 5 + ((v - 120) / 40) * 5);
  }

  private scoreRespRate(v: number): number {
    if (v >= 12 && v <= 20) return 0;
    if (v >= 8 && v < 12) return ((12 - v) / 4) * 5;
    if (v > 20 && v <= 30) return ((v - 20) / 10) * 5;
    if (v < 8) return Math.min(10, 5 + ((8 - v) / 8) * 5);
    return Math.min(10, 5 + ((v - 30) / 20) * 5);
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
