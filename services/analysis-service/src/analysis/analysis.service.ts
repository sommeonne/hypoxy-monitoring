import { Injectable, Logger } from '@nestjs/common';
import { AlertLevel, THRESHOLDS, Measurement, AnalysisResult, ConcludeRequest, ConcludeResponse } from './thresholds';
import { RedisPublisherService } from '../redis/redis-publisher.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly REACTION_THRESHOLD = 30; 

  constructor(private readonly redisPublisher: RedisPublisherService) {}

  async analyze(measurement: Measurement): Promise<AnalysisResult> {
    const anomalies: string[] = [];
    let level: AlertLevel = AlertLevel.NORMAL as AlertLevel;

    const markCritical = (msg: string) => {
      anomalies.push(msg);
      level = AlertLevel.CRITICAL;
    };
    
    if (measurement.spo2 != null) {
      if (measurement.spo2 < THRESHOLDS.spo2.critical) {
        markCritical(`SpO2 critically low: ${measurement.spo2}%`);
      }
    }

    if (measurement.heartRate != null) {
      if (
        measurement.heartRate < THRESHOLDS.heartRate.criticalMin ||
        measurement.heartRate > THRESHOLDS.heartRate.criticalMax
      ) {
        markCritical(`Heart rate critically abnormal: ${measurement.heartRate} bpm`);
      }
    }

    if (measurement.respiratoryRate != null) {
      if (
        measurement.respiratoryRate < THRESHOLDS.respiratoryRate.criticalMin ||
        measurement.respiratoryRate > THRESHOLDS.respiratoryRate.criticalMax
      ) {
        markCritical(`Respiratory rate critically abnormal: ${measurement.respiratoryRate} breaths/min`);
      }
    }

    if (measurement.tidalVolume != null) {
      if (
        measurement.tidalVolume < THRESHOLDS.tidalVolume.criticalMin ||
        measurement.tidalVolume > THRESHOLDS.tidalVolume.criticalMax
      ) {
        markCritical(`Tidal volume critically abnormal: ${measurement.tidalVolume} mL`);
      }
    }

    const result: AnalysisResult = {
      level,
      anomalies,
      measurement,
    };

    if (level === AlertLevel.CRITICAL) {
      this.logger.warn(`Critical alert detected for patient ${measurement.patientId}`);
      await this.sendAlert(result);
    }

    return result;
  }

  computeConclusion(req: ConcludeRequest): ConcludeResponse {
    const { finalSpo2, finalHeartRate, finalRespiratoryRate, finalTidalVolume, o2Percentage } = req;

    const refHR = req.baselineHeartRate;
    const refRR = req.baselineRespiratoryRate;
    const refTV = req.baselineTidalVolume;

    const hrChange = this.calculateChangePct(refHR, finalHeartRate);
    const rrChange = this.calculateChangePct(refRR, finalRespiratoryRate);
    const tvChange = (refTV != null && finalTidalVolume != null) 
      ? this.calculateChangePct(refTV, finalTidalVolume) 
      : null;

    const resistance = this.getResistanceStatus(finalSpo2, o2Percentage);
    const reaction = this.getReactionStatus(hrChange, rrChange, tvChange);

    return { 
      conclusion: `${resistance}, ${reaction}` 
    };
  }

  private calculateChangePct(ref: number | null | undefined, final: number | null | undefined): number {
    if (ref == null || final == null || ref <= 0) return 0;
    return Math.abs((final - ref) / ref) * 100;
  }

  private getResistanceStatus(spo2: number | null | undefined, o2Pct: number | null | undefined): string {
    if (spo2 == null) return 'Hypoxia tolerance unknown (no data)';
    if (spo2 > 85) return 'Hypoxia tolerance high';
    if (spo2 >= 80) return 'Hypoxia tolerance normal';
    
    if (spo2 >= 75) {
      const o2 = o2Pct ?? 10;
      if (o2 <= 10) return 'Hypoxia tolerance moderately reduced';
      if (o2 <= 12) return 'Hypoxia tolerance reduced';
      return 'Hypoxia tolerance sharply reduced';
    }
    
    return 'Hypoxia tolerance sharply reduced';
  }

  private getReactionStatus(hrChange: number, rrChange: number, tvChange: number | null): string {
    const hrElevated = hrChange > this.REACTION_THRESHOLD;
    const respElevated = rrChange > this.REACTION_THRESHOLD || (tvChange !== null && tvChange > this.REACTION_THRESHOLD);

    if (hrElevated && respElevated) return 'hemodynamic and respiratory reaction elevated';
    if (hrElevated) return 'hemodynamic reaction elevated';
    if (respElevated) return 'respiratory reaction elevated';
    return 'reaction normal';
  }

  private async sendAlert(result: AnalysisResult): Promise<void> {
    await this.redisPublisher.xadd('critical-alerts', {
      patientId: result.measurement.patientId,
      sessionId: result.measurement.sessionId,
      measurementId: result.measurement.id,
      level: result.level,
      values: JSON.stringify({
        spo2: result.measurement.spo2,
        heartRate: result.measurement.heartRate,
        respiratoryRate: result.measurement.respiratoryRate,
        ...(result.measurement.tidalVolume != null && { tidalVolume: result.measurement.tidalVolume }),
      }),
    });
  }
}