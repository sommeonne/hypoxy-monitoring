import { api } from './client';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis?: string;
  notes?: string;
  createdAt: string;
}

export const fetchPatients = () => api.get<Patient[]>('/patients');
export const fetchPatient = (id: string) => api.get<Patient>(`/patients/${id}`);
export const createPatient = (data: Omit<Patient, 'id' | 'createdAt'>) =>
  api.post<Patient>('/patients', data);
export const deletePatient = (id: string) => api.delete(`/patients/${id}`);
