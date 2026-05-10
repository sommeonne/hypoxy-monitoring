import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DataFetcherService {
  private readonly logger = new Logger(DataFetcherService.name);

  constructor(private readonly config: ConfigService) {}

  private get deviceUrl() {
    return this.config.getOrThrow('DEVICE_SERVICE_URL');
  }
  private get patientUrl() {
    return this.config.getOrThrow('PATIENT_SERVICE_URL');
  }
  private get sessionUrl() {
    return this.config.getOrThrow('SESSION_SERVICE_URL');
  }
  private get alertUrl() {
    return this.config.getOrThrow('ALERT_SERVICE_URL');
  }

  async getSession(sessionId: string): Promise<any> {
    const res = await fetch(`${this.sessionUrl}/sessions/${sessionId}`, {
      headers: { 'x-user-role': 'doctor' },
    });
    if (!res.ok) throw new Error(`session-service returned ${res.status} for session ${sessionId}`);
    return res.json();
  }

  async getPatient(patientId: string): Promise<any> {
    const res = await fetch(`${this.patientUrl}/patients/${patientId}`, {
      headers: { 'x-user-role': 'doctor' },
    });
    if (!res.ok) throw new Error(`patient-service returned ${res.status} for patient ${patientId}`);
    return res.json();
  }

  async getMeasurements(sessionId: string): Promise<any[]> {
    const res = await fetch(`${this.deviceUrl}/devices/measurements/${sessionId}`, {
      headers: { 'x-user-role': 'doctor' },
    });
    if (!res.ok) throw new Error(`device-service returned ${res.status} for session ${sessionId}`);
    return res.json();
  }

  async getAlertsBySession(sessionId: string): Promise<any[]> {
    const res = await fetch(`${this.alertUrl}/alerts?sessionId=${sessionId}`, {
      headers: { 'x-user-role': 'doctor' },
    });
    if (!res.ok) throw new Error(`alert-service returned ${res.status} for session ${sessionId}`);
    return res.json();
  }
}
