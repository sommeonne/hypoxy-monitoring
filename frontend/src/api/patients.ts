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
  tidalVolume?: number;
  createdAt: string;
}

export type PatientPayload = Omit<Patient, 'id' | 'createdAt' | 'group'>;

export const fetchPatients = () => api.get<Patient[]>('/patients');
export const fetchPatient = (id: string) => api.get<Patient>(`/patients/${id}`);
export const createPatient = (data: PatientPayload) => api.post<Patient>('/patients', data);
export const updatePatient = (id: string, data: PatientPayload) =>
  api.put<Patient>(`/patients/${id}`, data);
export const deletePatient = (id: string) => api.delete(`/patients/${id}`);
