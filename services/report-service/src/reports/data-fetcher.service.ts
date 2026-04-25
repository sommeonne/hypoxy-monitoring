import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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

  async getSession(sessionId: string): Promise<any> {
    const res = await axios.get(`${this.sessionUrl}/sessions/${sessionId}`);
    return res.data;
  }

  async getPatient(patientId: string): Promise<any> {
    const res = await axios.get(`${this.patientUrl}/patients/${patientId}`);
    return res.data;
  }

  async getMeasurements(sessionId: string): Promise<any[]> {
    const res = await axios.get(`${this.deviceUrl}/devices/measurements/${sessionId}`);
    return res.data;
  }

  async getAlertsBySession(sessionId: string): Promise<any[]> {
    const res = await axios.get(`${this.alertUrl}/alerts?sessionId=${sessionId}`);
    return res.data;
  }
}
