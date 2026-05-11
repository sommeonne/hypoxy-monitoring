import { api } from './client';

export interface SessionSummary {
  durationMinutes: number;
  totalMeasurements: number;
  alertCount: number;
  avgSpo2: number;
  minSpo2: number;
  maxSpo2: number;
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  avgRespiratoryRate: number;
  minRespiratoryRate: number;
  maxRespiratoryRate: number;
  avgTidalVolume: number;
  minTidalVolume: number;
  maxTidalVolume: number;
}

export interface Session {
  id: string;
  patientId: string;
  doctorId?: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'cancelled';
  summary?: SessionSummary;
  notes?: string;
  o2Percentage?: number;
  plannedDurationSeconds?: number;
  conclusion?: string;
}

export const fetchActiveSessions = () => api.get<Session[]>('/sessions/active');
export const fetchSession = (id: string) => api.get<Session>(`/sessions/${id}`);
export const fetchPatientSessions = (patientId: string) =>
  api.get<Session[]>(`/sessions/patient/${patientId}`);
export const startSession = (data: {
  patientId: string;
  doctorId?: string;
  o2Percentage?: number;
  plannedDurationSeconds?: number;
}) => api.post<Session>('/sessions', data);
export const endSession = (id: string) =>
  api.put<Session>(`/sessions/${id}/end`, {});
export const updateSessionNotes = (id: string, notes: string) =>
  api.patch<Session>(`/sessions/${id}/notes`, { notes });
