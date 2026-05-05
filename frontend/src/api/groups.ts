import { api } from './client';

export interface Group {
  id: string;
  number: number;
  createdAt: string;
}

export const fetchGroups = () => api.get<Group[]>('/groups');
export const createGroup = (number: number) => api.post<Group>('/groups', { number });
export const deleteGroup = (id: string) => api.delete(`/groups/${id}`);
