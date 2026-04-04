import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Measurement } from '../api/measurements';
import dayjs from 'dayjs';

interface Props { measurements: Measurement[] }

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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis yAxisId="spo2" domain={[80, 100]} orientation="left" />
        <YAxis yAxisId="hr" domain={[40, 160]} orientation="right" />
        <Tooltip />
        <Legend />
        <ReferenceLine yAxisId="spo2" y={90} stroke="red" strokeDasharray="4 4" />
        <ReferenceLine yAxisId="spo2" y={94} stroke="orange" strokeDasharray="4 4" />
        <Line yAxisId="spo2" type="monotone" dataKey="spo2" stroke="#1890ff" name="SpO2 (%)" dot={false} strokeWidth={2} />
        <Line yAxisId="hr" type="monotone" dataKey="heartRate" stroke="#ff4d4f" name="Heart Rate" dot={false} strokeWidth={2} />
        <Line yAxisId="spo2" type="monotone" dataKey="respiratoryRate" stroke="#52c41a" name="Resp. Rate" dot={false} strokeWidth={1} />
      </LineChart>
    </ResponsiveContainer>
  );
}
