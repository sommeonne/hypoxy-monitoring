import { api } from './client';

export interface Patient {
  id: string;
  cardNumber: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  dateOfBirth: string;
  groupId?: string;
  group?: { id: string; number: number };
  height: number;
  weight: number;
  gender: string;
  address: string;
  phone: string;
  email: string;
  baselineHeartRate?: number;
  baselineRespiratoryRate?: number;
  baselineTidalVolume?: number;
  createdAt: string;
}

export type PatientPayload = Omit<Patient, 'id' | 'createdAt' | 'group'>;

export interface PatientFilters {
  cardNumber?: string;
  groupId?: string;
}

export const fetchPatients = (filters?: PatientFilters) => {
  const params = new URLSearchParams();
  if (filters?.cardNumber) params.set('cardNumber', filters.cardNumber);
  if (filters?.groupId) params.set('groupId', filters.groupId);
  const qs = params.toString();
  return api.get<Patient[]>(qs ? `/patients?${qs}` : '/patients');
};
export const fetchPatient = (id: string) => api.get<Patient>(`/patients/${id}`);
export const createPatient = (data: PatientPayload) => api.post<Patient>('/patients', data);
export const updatePatient = (id: string, data: PatientPayload) =>
  api.put<Patient>(`/patients/${id}`, data);
export const deletePatient = (id: string) => api.delete(`/patients/${id}`);
