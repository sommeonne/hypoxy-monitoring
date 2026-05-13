import { api } from './client';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: { id: string; name: string } | null;
  role: string;
  createdAt: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  specializationId?: string;
  role?: 'admin' | 'doctor';
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  specializationId?: string | null;
}

export const fetchUsers = () => api.get<User[]>('/users');
export const createUser = (data: CreateUserPayload) => api.post<User>('/users', data);
export const updateUser = (id: string, data: UpdateUserPayload) => api.patch<User>(`/users/${id}`, data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`);
