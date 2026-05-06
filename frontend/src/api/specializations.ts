import { api } from './client';

export interface Specialization {
  id: string;
  name: string;
  createdAt: string;
}

export const fetchSpecializations = () => api.get<Specialization[]>('/specializations');
export const createSpecialization = (name: string) => api.post<Specialization>('/specializations', { name });
export const deleteSpecialization = (id: string) => api.delete(`/specializations/${id}`);
