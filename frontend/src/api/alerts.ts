import { api } from './client';

export interface Alert {
  id: string;
  patientId: string;
  sessionId: string;
  measurementId: string;
  level: 'CRITICAL' | 'WARNING';
  values: Record<string, number>;
  createdAt: string;
}

export const fetchAlerts = (params?: { patientId?: string; sessionId?: string }) => {
  const query = new URLSearchParams();
  if (params?.patientId) query.set('patientId', params.patientId);
  if (params?.sessionId) query.set('sessionId', params.sessionId);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return api.get<Alert[]>(`/alerts${qs}`);
};
