import React from 'react';
import { HeartOutlined, ThunderboltOutlined } from '@ant-design/icons';

interface Props {
  spo2: number;
  heartRate: number;
  respiratoryRate: number;
  hypoxiaIndex?: number;
}

function getSpo2Color(v: number): string {
  if (v < 90) return '#E24B4A';
  if (v < 94) return '#EF9F27';
  return '#1D9E75';
}

function getHeartRateColor(v: number): string {
  if (v < 50 || v > 120) return '#E24B4A';
  if (v < 60 || v > 100) return '#EF9F27';
  return '#1D9E75';
}

function getRespRateColor(v: number): string {
  if (v < 8 || v > 30) return '#E24B4A';
  if (v < 12 || v > 20) return '#EF9F27';
  return '#1D9E75';
}

function getHypoxiaColor(v: number): string {
  if (v >= 6) return '#E24B4A';
  if (v >= 3) return '#EF9F27';
  return '#1D9E75';
}

function getSpo2Status(spo2: number): { label: string; bg: string; color: string } {
  if (spo2 < 90) return { label: 'CRITICAL', bg: '#FEF2F2', color: '#E24B4A' };
  if (spo2 < 94) return { label: 'WARNING', bg: '#FFFBEB', color: '#EF9F27' };
  return { label: 'NORMAL', bg: '#E1F5EE', color: '#1D9E75' };
}

function VitalCard({
  label,
  value,
  unit,
  icon,
  large,
  color,
}: {
  label: string;
  value: number | string;
  unit: string;
  icon?: React.ReactNode;
  large?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderRadius: 10,
        border: '1px solid #E2E8F0',
        background: '#fff',
        minWidth: large ? 160 : 130,
        flex: large ? '0 0 auto' : '1 1 auto',
      }}
    >
      <div className="label-caps" style={{ marginBottom: 8 }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontSize: large ? 40 : 28,
            fontWeight: 700,
            lineHeight: 1,
            color: color ?? '#0F172A',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

function getHypoxiaStatus(v: number): { label: string; bg: string; color: string } {
  if (v >= 6) return { label: 'CRITICAL', bg: '#FEF2F2', color: '#E24B4A' };
  if (v >= 3) return { label: 'WARNING', bg: '#FFFBEB', color: '#EF9F27' };
  return { label: 'NORMAL', bg: '#E1F5EE', color: '#1D9E75' };
}

export default function VitalSign({ spo2, heartRate, respiratoryRate, hypoxiaIndex }: Props) {
  const { label, bg, color } = hypoxiaIndex !== undefined
    ? getHypoxiaStatus(hypoxiaIndex)
    : getSpo2Status(spo2);

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {hypoxiaIndex !== undefined && (
        <VitalCard
          label="Hypoxia Index"
          value={hypoxiaIndex}
          unit="/ 10"
          large
          color={getHypoxiaColor(hypoxiaIndex)}
        />
      )}

      <VitalCard label="SpO₂" value={spo2} unit="%" color={getSpo2Color(spo2)} />

      <VitalCard
        label="Heart Rate"
        value={heartRate}
        unit="bpm"
        icon={<HeartOutlined style={{ color: getHeartRateColor(heartRate) }} />}
        color={getHeartRateColor(heartRate)}
      />

      <VitalCard
        label="Resp. Rate"
        value={respiratoryRate}
        unit="/min"
        icon={<ThunderboltOutlined style={{ color: getRespRateColor(respiratoryRate) }} />}
        color={getRespRateColor(respiratoryRate)}
      />

      <div
        style={{
          alignSelf: 'flex-end',
          padding: '6px 14px',
          borderRadius: 8,
          background: bg,
          color: color,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          border: `1px solid ${color}22`,
        }}
      >
        {label}
      </div>
    </div>
  );
}
