import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { Measurement } from '../api/measurements';
import dayjs from 'dayjs';

interface Props { measurements: Measurement[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#0F172A',
        border: 'none',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        color: '#F1F5F9',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ marginBottom: 6, color: '#94A3B8', fontSize: 11 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#CBD5E1' }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function MeasurementChart({ measurements }: Props) {
  const data = [...measurements]
    .reverse()
    .slice(-60)
    .map((m) => ({
      time: dayjs(m.createdAt).format('HH:mm:ss'),
      spo2: m.spo2,
      heartRate: m.heartRate,
      respiratoryRate: m.respiratoryRate,
    }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          interval="preserveStartEnd"
        />

        {/* SpO2 axis (left) */}
        <YAxis
          yAxisId="spo2"
          domain={[80, 100]}
          orientation="left"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />

        {/* Heart rate axis (right) */}
        <YAxis
          yAxisId="hr"
          domain={[40, 160]}
          orientation="right"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: '#64748B' }}>{value}</span>}
        />

        {/* ── Critical zone: red transparent band below 85% ── */}
        <ReferenceArea
          yAxisId="spo2"
          y1={80}
          y2={85}
          fill="#E24B4A"
          fillOpacity={0.08}
        />

        {/* ── Warning zone: amber transparent band 85-90% ── */}
        <ReferenceArea
          yAxisId="spo2"
          y1={85}
          y2={90}
          fill="#EF9F27"
          fillOpacity={0.06}
        />

        {/* ── Threshold lines ── */}
        <ReferenceLine
          yAxisId="spo2"
          y={85}
          stroke="#E24B4A"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          label={{ value: '85%', position: 'left', fontSize: 10, fill: '#E24B4A' }}
        />
        <ReferenceLine
          yAxisId="spo2"
          y={90}
          stroke="#EF9F27"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          label={{ value: '90%', position: 'left', fontSize: 10, fill: '#EF9F27' }}
        />

        {/* ── Data lines ── */}
        <Line
          yAxisId="spo2"
          type="monotone"
          dataKey="spo2"
          stroke="#1D9E75"
          name="SpO₂ (%)"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4, fill: '#1D9E75' }}
        />
        <Line
          yAxisId="hr"
          type="monotone"
          dataKey="heartRate"
          stroke="#E24B4A"
          name="Heart Rate"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4, fill: '#E24B4A' }}
        />
        <Line
          yAxisId="spo2"
          type="monotone"
          dataKey="respiratoryRate"
          stroke="#7F77DD"
          name="Resp. Rate"
          dot={false}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          activeDot={{ r: 3, fill: '#7F77DD' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
