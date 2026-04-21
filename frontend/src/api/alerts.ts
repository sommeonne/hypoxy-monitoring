import { api } from './client';

export interface Alert {
  id: string;
  patientId: string;
  sessionId: string;
  measurementId: string;
  level: 'CRITICAL' | 'WARNING';
  message: string;
  values: Record<string, number>;
  createdAt: string;
}

export const fetchAlerts = (params?: { patientId?: string }) => {
  const qs = params?.patientId ? `?patientId=${params.patientId}` : '';
  return api.get<Alert[]>(`/alerts${qs}`);
};
