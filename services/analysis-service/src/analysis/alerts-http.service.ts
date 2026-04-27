import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertLevel } from './thresholds';

export interface CreateAlertPayload {
  patientId: string;
  sessionId: string;
  measurementId: string;
  level: AlertLevel;
  message: string;
  values: Record<string, number>;
}

@Injectable()
export class AlertsHttpService {
  private readonly logger = new Logger(AlertsHttpService.name);
  private readonly alertServiceUrl: string;

  constructor(private readonly config: ConfigService) {
    this.alertServiceUrl = config.get('ALERT_SERVICE_URL', 'http://alert-service:3004');
  }

  async createAlert(payload: CreateAlertPayload): Promise<void> {
    await fetch(`${this.alertServiceUrl}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    this.logger.log(`Alert sent: ${payload.level} for patient ${payload.patientId}`);
  }
}
