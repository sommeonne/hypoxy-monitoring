import { api } from './client';

export interface SessionSummary {
  avgSpo2: number;
  avgHeartRate: number;
  avgRespiratoryRate: number;
  minSpo2: number;
  maxHeartRate: number;
  durationMinutes: number;
  totalMeasurements: number;
  alertCount: number;
}

export interface Session {
  id: string;
  patientId: string;
  doctorId?: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'cancelled';
  summary?: SessionSummary;
}

export const fetchActiveSessions = () => api.get<Session[]>('/sessions/active');
export const fetchSession = (id: string) => api.get<Session>(`/sessions/${id}`);
export const fetchPatientSessions = (patientId: string) =>
  api.get<Session[]>(`/sessions/patient/${patientId}`);
export const startSession = (data: { patientId: string; doctorId?: string }) =>
  api.post<Session>('/sessions', data);
export const endSession = (id: string) => api.put<Session>(`/sessions/${id}/end`, {});
