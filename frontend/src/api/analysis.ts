import { api } from './client';

export interface ConcludeRequest {
  finalSpo2: number;
  finalHeartRate: number;
  finalRespiratoryRate: number;
  finalTidalVolume?: number;
  o2Percentage?: number;
  firstHeartRate?: number;
  firstRespiratoryRate?: number;

  baselineHeartRate?: number;
  baselineRespiratoryRate?: number;
  baselineTidalVolume?: number;
}

export interface ConcludeResponse {
  conclusion: string;
}

export const concludeSession = (data: ConcludeRequest) =>
  api.post<ConcludeResponse>('/analysis/conclude', data);
