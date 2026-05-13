import React, { useState, useEffect } from 'react';
import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { Table, Empty } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAlerts, Alert } from '../api/alerts';
import { useSocket } from '../hooks/useSocket';

interface Props {
  sessionId: string;
}

function SCard({ title, children, titleRight }: { title: React.ReactNode; children: React.ReactNode; titleRight?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '9px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        {titleRight}
      </div>
      {children}
    </div>
  );
}

function LevelTag({ level }: { level: string }) {
  const isC = level === 'CRITICAL';
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
      background: isC ? '#FEF2F2' : '#FFFBEB',
      color: isC ? '#E24B4A' : '#EF9F27',
    }}>
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

export default function SessionAlertsCard({ sessionId }: Props) {
  const queryClient = useQueryClient();
  const { on } = useSocket();
  const [sortDesc, setSortDesc] = useState(true);

  const { data: alerts = [] } = useQuery({
    queryKey: ['sessionAlerts', sessionId],
    queryFn: () => fetchAlerts({ sessionId }),
  });

  useEffect(() => {
    return on('alert:new', (a: Alert) => {
      if (a.sessionId === sessionId) {
        queryClient.invalidateQueries({ queryKey: ['sessionAlerts', sessionId] });
      }
    });
  }, [on, sessionId, queryClient]);

  const sorted = [...alerts].sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return sortDesc ? diff : -diff;
  });

  return (
    <SCard
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Alerts</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: alerts.length > 0 ? '#FFFBEB' : '#F1F5F9',
            color: alerts.length > 0 ? '#EF9F27' : '#64748B',
          }}>
            {alerts.length}
          </span>
        </div>
      }
      titleRight={
        <button
          onClick={() => setSortDesc((v) => !v)}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 4, border: '1px solid #E2E8F0',
            cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: '#64748B',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          title={sortDesc ? 'Newest first' : 'Oldest first'}
        >
          {sortDesc ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
          {sortDesc ? 'Newest' : 'Oldest'}
        </button>
      }
    >
      <Table
        dataSource={sorted}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, size: 'small' }}
        className="teal-table"
        style={{ margin: 0 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No alerts" /> }}
        columns={COLUMNS}
      />
    </SCard>
  );
}
