import { Injectable, Logger } from '@nestjs/common';
import { AlertLevel, THRESHOLDS, Measurement, AnalysisResult, ConcludeRequest, ConcludeResponse } from './thresholds';
import { RedisPublisherService } from './redis-publisher.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(private readonly redisPublisher: RedisPublisherService) {}

  async analyze(measurement: Measurement): Promise<AnalysisResult> {
    const anomalies: string[] = [];
    let level: AlertLevel = AlertLevel.NORMAL as AlertLevel;

    const markCritical = (msg: string) => {
      anomalies.push(msg);
      level = AlertLevel.CRITICAL;
    };

    if (measurement.spo2 < THRESHOLDS.spo2.critical) {
      markCritical(`SpO2 critically low: ${measurement.spo2}%`);
    }

    if (
      measurement.heartRate < THRESHOLDS.heartRate.criticalMin ||
      measurement.heartRate > THRESHOLDS.heartRate.criticalMax
    ) {
      markCritical(`Heart rate critically abnormal: ${measurement.heartRate} bpm`);
    }

    if (
      measurement.respiratoryRate < THRESHOLDS.respiratoryRate.criticalMin ||
      measurement.respiratoryRate > THRESHOLDS.respiratoryRate.criticalMax
    ) {
      markCritical(`Respiratory rate critically abnormal: ${measurement.respiratoryRate} breaths/min`);
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

  computeConclusion(req: ConcludeRequest): ConcludeResponse {
    const { finalSpo2, finalHeartRate, finalRespiratoryRate, finalTidalVolume, o2Percentage } = req;

    const refHR = req.baselineHeartRate ?? req.firstHeartRate ?? finalHeartRate;
    const refRR = req.baselineRespiratoryRate ?? req.firstRespiratoryRate ?? finalRespiratoryRate;
    const refTV = req.baselineTidalVolume ?? finalTidalVolume;

    const hrChangePct = refHR > 0 ? Math.abs((finalHeartRate - refHR) / refHR) * 100 : 0;
    const rrChangePct = refRR > 0 ? Math.abs((finalRespiratoryRate - refRR) / refRR) * 100 : 0;
    const tvChangePct =
      refTV != null && refTV > 0 && finalTidalVolume != null
        ? Math.abs((finalTidalVolume - refTV) / refTV) * 100
        : null;

    let resistance: string;
    if (finalSpo2 > 85) {
      resistance = 'Hypoxia tolerance high';
    } else if (finalSpo2 >= 80) {
      resistance = 'Hypoxia tolerance normal';
    } else if (finalSpo2 >= 75) {
      const o2 = o2Percentage ?? 10;
      if (o2 <= 10) resistance = 'Hypoxia tolerance moderately reduced';
      else if (o2 <= 12) resistance = 'Hypoxia tolerance reduced';
      else resistance = 'Hypoxia tolerance sharply reduced';
    } else {
      resistance = 'Hypoxia tolerance sharply reduced';
    }

    const hrElevated = hrChangePct > 30;

    const respiratoryElevated =
      tvChangePct != null ? tvChangePct > 30 : rrChangePct > 30;

    let reaction: string;
    if (hrElevated && respiratoryElevated) reaction = 'hemodynamic and respiratory reaction elevated';
    else if (hrElevated) reaction = 'hemodynamic reaction elevated';
    else if (respiratoryElevated) reaction = 'respiratory reaction elevated';
    else reaction = 'reaction normal';

    return { conclusion: `${resistance}, ${reaction}` };
  }

  private async sendAlert(result: AnalysisResult): Promise<void> {
    await this.redisPublisher.publish('critical', JSON.stringify({
      patientId: result.measurement.patientId,
      sessionId: result.measurement.sessionId,
      measurementId: result.measurement.id,
      level: result.level,
values: {
        spo2: result.measurement.spo2,
        heartRate: result.measurement.heartRate,
        respiratoryRate: result.measurement.respiratoryRate,
        ...(result.measurement.tidalVolume != null && { tidalVolume: result.measurement.tidalVolume }),
      },
    }));
  }
}
