export enum AlertLevel {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  NORMAL = 'NORMAL',
}

export const THRESHOLDS = {
  spo2: {
    // Below 90% indicates severe hypoxaemia; immediate clinical intervention required
    critical: 90,
    // 90–93% is moderate hypoxaemia; escalate monitoring and consider supplemental O2
    warning: 94,
    // Above 98% indicates hyperoxia; excess O2 causes oxidative stress and vasoconstriction
    hyperoxiaWarning: 98,
    // 97–98% is mild hyperoxia; only clinically significant when patient has a known lower baseline
    mildHyperoxiaWarning: 96,
  },
  heartRate: {
    // Below 40 bpm is severe bradycardia; risk of haemodynamic compromise and syncope
    criticalMin: 40,
    // Above 150 bpm is severe tachycardia; risk of cardiac output failure and arrhythmia
    criticalMax: 150,
    // 40–59 bpm is mild bradycardia; may indicate conduction disorder — monitor closely
    warningMin: 60,
    // 101–150 bpm is mild/moderate tachycardia; investigate underlying cause
    warningMax: 100,
  },
  respiratoryRate: {
    // Below 12 breaths/min may indicate respiratory depression or CNS sedation
    min: 12,
    // Above 20 breaths/min (tachypnoea) is a key early sign of respiratory distress
    max: 20,
  },
};

export interface Measurement {
  id: string;
  patientId: string;
  sessionId: string;
  spo2: number;
  heartRate: number;
  respiratoryRate: number;
  createdAt: Date;
  /**
   * Patient's known stable SpO2 baseline (e.g. COPD patients whose resting
   * SpO2 is normally below the standard 94% threshold). When provided, the
   * effective SpO2 warning threshold is lowered to Math.max(94, baseline - 4)
   * so that physiologically normal low-normal readings do not generate false alerts.
   */
  baselineSpO2?: number;
}

export interface AnalysisResult {
  level: AlertLevel;
  message: string;
  anomalies: string[];
  measurement: Measurement;
}
