import React from 'react';
import { Statistic, Tag } from 'antd';
import { HeartOutlined } from '@ant-design/icons';

interface Props {
  spo2: number;
  heartRate: number;
  respiratoryRate: number;
}

function getSpo2Color(spo2: number) {
  if (spo2 < 90) return '#ff4d4f';
  if (spo2 < 94) return '#faad14';
  return '#52c41a';
}

function getSpo2Label(spo2: number) {
  if (spo2 < 90) return { label: 'CRITICAL', color: 'red' };
  if (spo2 < 94) return { label: 'WARNING', color: 'orange' };
  return { label: 'NORMAL', color: 'green' };
}

export default function VitalSign({ spo2, heartRate, respiratoryRate }: Props) {
  const { label, color } = getSpo2Label(spo2);
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
      <Statistic
        title="SpO2"
        value={spo2}
        suffix="%"
        valueStyle={{ color: getSpo2Color(spo2) }}
      />
      <Statistic title="Heart Rate" value={heartRate} suffix="bpm" prefix={<HeartOutlined />} />
      <Statistic title="Resp. Rate" value={respiratoryRate} suffix="/min" />
      <Tag color={color}>{label}</Tag>
    </div>
  );
}
