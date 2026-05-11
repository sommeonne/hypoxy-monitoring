import { api } from './client';

export interface Measurement {
  id: string;
  patientId: string;
  sessionId: string;
  spo2: number;
  heartRate: number;
  respiratoryRate: number;
  o2Percentage?: number;
  tidalVolume?: number;
  createdAt: string;
}

export const fetchSessionMeasurements = (sessionId: string) =>
  api.get<Measurement[]>(`/device/measurements/${sessionId}`);

export const fetchLatestMeasurement = (patientId: string) =>
  api.get<Measurement>(`/device/latest/${patientId}`);
