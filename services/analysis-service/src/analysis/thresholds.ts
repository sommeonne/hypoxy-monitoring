export enum AlertLevel {
  CRITICAL = 'CRITICAL',
  NORMAL = 'NORMAL',
}

export const THRESHOLDS = {
  spo2: {
    critical: 80,
  },
  heartRate: {
    criticalMin: 45,
    criticalMax: 130,
  },
  respiratoryRate: {
    criticalMin: 8,
    criticalMax: 30,
  },
  tidalVolume: {
    criticalMin: 250,
    criticalMax: 900,
  },
};

export interface Measurement {
  id: string;
  patientId: string;
  sessionId: string;
  spo2: number;
  heartRate: number;
  respiratoryRate: number;
  tidalVolume?: number;
  o2Percentage?: number;
  createdAt: Date;
  baselineSpO2?: number;
  baselineHeartRate?: number;
  baselineRespiratoryRate?: number;
}

export interface AnalysisResult {
  level: AlertLevel;
  message: string;
  anomalies: string[];
  measurement: Measurement;
}

export interface ConcludeRequest {
  finalSpo2: number;
  finalHeartRate: number;
  finalRespiratoryRate: number;
  o2Percentage?: number;
  firstHeartRate?: number;
  firstRespiratoryRate?: number;
  baselineHeartRate?: number;
  baselineRespiratoryRate?: number;
}

export interface ConcludeResponse {
  conclusion: string;
}
