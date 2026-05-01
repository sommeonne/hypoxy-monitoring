import { api } from './client';

export interface Doctor {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  unifiedNumber: string;
  role: string;
  createdAt: string;
}

export interface CreateDoctorPayload {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  unifiedNumber: string;
  role?: 'admin' | 'doctor';
}

export const fetchDoctors = () => api.get<Doctor[]>('/doctors');
export const createDoctor = (data: CreateDoctorPayload) => api.post<Doctor>('/doctors', data);
export const deleteDoctor = (id: string) => api.delete(`/doctors/${id}`);
