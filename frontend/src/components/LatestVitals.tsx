import React from 'react';


// ─── Public types ────────────────────────────────────────────────────────────

export interface VitalTrends {
  spo2?: number[];
  o2?: number[];
  heartRate?: number[];
  respRate?: number[];
}

export interface VitalsData {
  spo2: number;
  o2?: number;
  heartRate: number;
  respRate: number;
  updatedAt: string;
  trends?: VitalTrends;
}

// ─── Status ───────────────────────────────────────────────────────────────────

type Status = 'normal' | 'watch' | 'critical' | 'info';

const STATUS_TOKEN: Record<Status, { text: string; dot: string; label: string }> = {
  normal:   { text: '#1D9E75', dot: '#1D9E75', label: 'Normal'   },
  watch:    { text: '#EF9F27', dot: '#EF9F27', label: 'Watch'    },
  critical: { text: '#E24B4A', dot: '#E24B4A', label: 'Critical' },
  info:     { text: '#3B82F6', dot: '#3B82F6', label: 'Active'   },
};

const BORDER = '#E2E8F0';
const BG     = '#fff';

function spo2Status(v: number): Status {
  if (v < 90) return 'critical';
  if (v < 94) return 'watch';
  return 'normal';
}
function hrStatus(v: number): Status {
  if (v < 50 || v > 120) return 'critical';
  if (v < 60 || v > 100) return 'watch';
  return 'normal';
}
function rrStatus(v: number): Status {
  if (v < 8 || v > 30) return 'critical';
  if (v < 12 || v > 20) return 'watch';
  return 'normal';
}
// ─── StatusChip ───────────────────────────────────────────────────────────────

const CHIP_BG: Record<Status, string>     = { normal: '#E1F5EE', watch: '#FFFBEB', critical: '#FEF2F2', info: '#EFF6FF' };
const CHIP_BORDER: Record<Status, string> = { normal: '#A7F3D0', watch: '#FDE68A', critical: '#FECACA', info: '#BFDBFE' };

function StatusChip({ status }: { status: Status }) {
  const t = STATUS_TOKEN[status];
  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        background: CHIP_BG[status],
        color: t.text,
        border: `1px solid ${CHIP_BORDER[status]}`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <svg width={6} height={6} aria-hidden="true">
        <circle cx={3} cy={3} r={3} fill={t.dot} />
      </svg>
      {t.label}
    </span>
  );
}

// ─── Secondary metric tile ────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  unit,
  status,
  ariaLabel,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  status: Status;
  ariaLabel: string;
  icon?: React.ReactNode;
}) {
  const t = STATUS_TOKEN[status];
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: `1.5px solid ${BORDER}`,
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94A3B8',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {icon}
          {label}
        </span>
        <StatusChip status={status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span
          aria-label={ariaLabel}
          style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: t.text, fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LatestVitals({ vitals }: { vitals: VitalsData }) {
  const s2Status  = spo2Status(vitals.spo2);
  const hrStatus_ = hrStatus(vitals.heartRate);
  const rrStatus_ = rrStatus(vitals.respRate);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 10,
      }}
    >
        <MetricTile
          label="SpO₂"
          value={vitals.spo2}
          unit="%"
          status={s2Status}
          ariaLabel={`SpO2 ${vitals.spo2} percent, ${STATUS_TOKEN[s2Status].label}`}
        />

        {vitals.o2 != null ? (
          <MetricTile
            label="O₂ Conc."
            value={vitals.o2}
            unit="%"
            status="info"
            ariaLabel={`Inhaled O2 concentration ${vitals.o2} percent`}

          />
        ) : (
          <div />
        )}

        <MetricTile
          label="Heart Rate"
          value={vitals.heartRate}
          unit="bpm"
          status={hrStatus_}
          ariaLabel={`Heart rate ${vitals.heartRate} beats per minute, ${STATUS_TOKEN[hrStatus_].label}`}

        />

        <MetricTile
          label="Resp. Rate"
          value={vitals.respRate}
          unit="/min"
          status={rrStatus_}
          ariaLabel={`Respiratory rate ${vitals.respRate} breaths per minute, ${STATUS_TOKEN[rrStatus_].label}`}

        />
    </div>
  );
}
