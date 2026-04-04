export enum AlertLevel {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  NORMAL = 'NORMAL',
}

export const THRESHOLDS = {
  spo2: { critical: 90, warning: 94 },
  heartRate: { min: 60, max: 100 },
  respiratoryRate: { min: 12, max: 20 },
};

export interface Measurement {
  id: string;
  patientId: string;
  sessionId: string;
  spo2: number;
  heartRate: number;
  respiratoryRate: number;
  createdAt: Date;
}

export interface AnalysisResult {
  level: AlertLevel;
  message: string;
  hypoxiaIndex: number;
  anomalies: string[];
  measurement: Measurement;
}
