import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DataFetcherService {
  private readonly logger = new Logger(DataFetcherService.name);

  constructor(private readonly config: ConfigService) {}

  private get deviceUrl() {
    return this.config.get('DEVICE_SERVICE_URL', 'http://device-service:3001');
  }
  private get patientUrl() {
    return this.config.get('PATIENT_SERVICE_URL', 'http://patient-service:3002');
  }
  private get sessionUrl() {
    return this.config.get('SESSION_SERVICE_URL', 'http://session-service:3005');
  }
  private get alertUrl() {
    return this.config.get('ALERT_SERVICE_URL', 'http://alert-service:3004');
  }

  private authHeaders(doctorId: string) {
    return { 'x-user-id': doctorId, 'x-user-role': 'doctor' };
  }

  async getSession(sessionId: string, doctorId: string): Promise<any> {
    const res = await fetch(`${this.sessionUrl}/sessions/${sessionId}`, {
      headers: this.authHeaders(doctorId),
    });
    if (!res.ok) throw new Error(`session-service returned ${res.status} for session ${sessionId}`);
    return res.json();
  }

  async getPatient(patientId: string, doctorId: string): Promise<any> {
    const res = await fetch(`${this.patientUrl}/patients/${patientId}`, {
      headers: this.authHeaders(doctorId),
    });
    if (!res.ok) throw new Error(`patient-service returned ${res.status} for patient ${patientId}`);
    return res.json();
  }

  async getMeasurements(sessionId: string, doctorId: string): Promise<any[]> {
    const res = await fetch(`${this.deviceUrl}/device/measurements/${sessionId}`, {
      headers: this.authHeaders(doctorId),
    });
    if (!res.ok) throw new Error(`device-service returned ${res.status} for session ${sessionId}`);
    return res.json();
  }

  async getAlertsBySession(sessionId: string, doctorId: string): Promise<any[]> {
    const res = await fetch(`${this.alertUrl}/alerts?sessionId=${sessionId}`, {
      headers: this.authHeaders(doctorId),
    });
    if (!res.ok) throw new Error(`alert-service returned ${res.status} for session ${sessionId}`);
    return res.json();
  }
}
