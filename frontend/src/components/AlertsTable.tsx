import React from 'react';
import { Table, Empty } from 'antd';
import { Alert } from '../api/alerts';

function LevelTag({ level }: { level: string }) {
  const isC = level === 'CRITICAL';
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: isC ? '#FEF2F2' : '#FFFBEB',
        color: isC ? '#E24B4A' : '#EF9F27',
      }}
    >
      {level.charAt(0) + level.slice(1).toLowerCase()}
    </span>
  );
}

function formatAlertValues(values: Record<string, number>): string {
  const parts: string[] = [];
  if (values.spo2 != null) parts.push(`SpO₂ ${values.spo2}%`);
  if (values.heartRate != null) parts.push(`HR ${values.heartRate}`);
  if (values.respiratoryRate != null) parts.push(`RR ${values.respiratoryRate}`);
  if (values.o2Percentage != null) parts.push(`O₂ ${values.o2Percentage}%`);
  if (values.tidalVolume != null) parts.push(`TV ${values.tidalVolume} mL`);
  return parts.join(' / ');
}

const COLUMNS = [
  {
    title: <span className="label-caps">Time</span>,
    dataIndex: 'createdAt',
    width: 80,
    render: (d: string) => (
      <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>
        {new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    ),
  },
  {
    title: <span className="label-caps">Level</span>,
    dataIndex: 'level',
    width: 100,
    render: (_: string, record: Alert) => <LevelTag level={record.level} />,
  },
  {
    title: <span className="label-caps">Triggered vitals</span>,
    dataIndex: 'values',
    render: (values: Record<string, number>) => (
      <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
        {values ? formatAlertValues(values) : '—'}
      </span>
    ),
  },
];

interface AlertsTableProps {
  alerts: Alert[];
  pageSize?: number;
}

export default function AlertsTable({ alerts, pageSize = 10 }: AlertsTableProps) {
  return (
    <Table
      dataSource={alerts}
      rowKey="id"
      size="small"
      pagination={{ pageSize, size: 'small' }}
      className="teal-table"
      style={{ margin: 0 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No alerts" /> }}
      columns={COLUMNS}
    />
  );
}