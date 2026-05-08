import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { Measurement } from '../api/measurements';
import dayjs from 'dayjs';

interface Props {
  measurements: Measurement[];
  metric: 'spo2' | 'heartRate' | 'respiratoryRate' | 'o2Percentage' | 'tidalVolume';
  color: string;
  name: string;
  unit: string;
  domain: [number | string, number | string];
  /** Draws a dashed horizontal reference line (e.g. set O₂ level) */
  referenceValue?: number;
  referenceLabel?: string;
  referenceColor?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#0F172A',
        border: 'none',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        color: '#F1F5F9',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ marginBottom: 4, color: '#94A3B8', fontSize: 11 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#CBD5E1' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{p.value} {unit}</span>
        </div>
      ))}
    </div>
  );
};

export default function MeasurementChart({
  measurements,
  metric,
  color,
  name,
  unit,
  domain,
  referenceValue,
  referenceLabel,
  referenceColor = '#F59E0B',
  height = 220,
}: Props) {
  const data = [...measurements]
    .reverse()
    .slice(-60)
    .map((m) => ({
      time:  dayjs(m.createdAt).format('HH:mm:ss'),
      value: m[metric] ?? null,
    }));

  const [hardMin, hardMax] = domain as [number, number];
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const dynamicDomain: [number, number] = values.length > 0
    ? (() => {
        const dMin = Math.min(...values);
        const dMax = Math.max(...values);
        const pad = Math.max((dMax - dMin) * 0.2, 1);
        return [
          Math.max(hardMin, Math.floor(dMin - pad)),
          Math.min(hardMax, Math.ceil(dMax + pad)),
        ];
      })()
    : [hardMin, hardMax];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          interval="preserveStartEnd"
        />

        <YAxis
          domain={dynamicDomain}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${unit}`}
          width={unit.length > 2 ? 62 : 44}
        />

        <Tooltip content={<CustomTooltip unit={unit} />} />

        {referenceValue != null && (
          <ReferenceLine
            y={referenceValue}
            stroke={referenceColor}
            strokeDasharray="6 3"
            strokeWidth={1.5}
          >
            {referenceLabel && (
              <Label
                value={referenceLabel}
                position="insideTopRight"
                style={{ fontSize: 10, fill: referenceColor }}
              />
            )}
          </ReferenceLine>
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          name={name}
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4, fill: color }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
