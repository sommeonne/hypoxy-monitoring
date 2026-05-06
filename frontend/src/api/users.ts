import { api } from './client';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string;
  role: string;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  specialization?: string;
  role?: 'admin' | 'doctor';
}

export const fetchUsers = () => api.get<User[]>('/users');
export const createUser = (data: CreateUserPayload) => api.post<User>('/users', data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`);
