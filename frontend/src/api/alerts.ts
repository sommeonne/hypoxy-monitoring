import { api } from './client';

export interface Alert {
  id: string;
  patientId: string;
  sessionId: string;
  measurementId: string;
  level: 'CRITICAL' | 'WARNING';
  message: string;
  values: Record<string, number>;
  acknowledged: boolean;
  createdAt: string;
}

export const fetchAlerts = (params?: { patientId?: string; acknowledged?: boolean }) => {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  return api.get<Alert[]>(`/alerts${qs}`);
};

export const fetchUnacknowledgedAlerts = () => api.get<Alert[]>('/alerts/unacknowledged');
export const acknowledgeAlert = (id: string) => api.put<Alert>(`/alerts/${id}/acknowledge`);
