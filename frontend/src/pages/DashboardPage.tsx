import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Typography, Empty, Spin } from 'antd';
import {
  MonitorOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActiveSessions } from '../api/sessions';
import { fetchPatients } from '../api/patients';
import { fetchAlerts, Alert } from '../api/alerts';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

type AlertFilter = 'ALL' | 'CRITICAL' | 'WARNING';

function StatCard({
  label,
  value,
  icon,
  accent,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}) {
  return (
    <Card
      style={{
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        borderLeft: `4px solid ${accent}`,
        background: '#fff',
        boxShadow: 'none',
      }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="label-caps" style={{ marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: accent,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { on } = useSocket();
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('ALL');
  const [sortDesc, setSortDesc] = useState(true);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: fetchActiveSessions,
    refetchInterval: 10_000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const patientNames = Object.fromEntries(
    patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
  );

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts(),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const offM = on('measurement:new', () =>
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] }),
    );
    const offA = on('alert:new', () =>
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    );
    const offS = on('session:updated', () =>
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] }),
    );
    return () => { offM(); offA(); offS(); };
  }, [on, queryClient]);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const criticalCount = alerts.filter((a) => a.level === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.level === 'WARNING').length;

  const filteredAlerts = alerts
    .filter((a) => alertFilter === 'ALL' || a.level === alertFilter)
    .sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortDesc ? diff : -diff;
    })
    .slice(0, 10);

  const filterButtons: { key: AlertFilter; label: string; cls: string }[] = [
    { key: 'ALL', label: `All (${alerts.length})`, cls: 'f-all' },
    { key: 'CRITICAL', label: `Critical (${criticalCount})`, cls: 'f-critical' },
    { key: 'WARNING', label: `Warning (${warningCount})`, cls: 'f-warning' },
  ];

  return (
    <div>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>Dashboard</h1>
        <Text style={{ color: '#64748B', fontSize: 13 }}>Real-time patient monitoring overview</Text>
      </div>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            label="Active Sessions"
            value={sessions.length}
            icon={<MonitorOutlined />}
            accent="#1D9E75"
            bg="#E1F5EE"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            label="Critical Alerts"
            value={criticalCount}
            icon={<AlertOutlined />}
            accent="#E24B4A"
            bg="#FEF2F2"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            label="Warning Alerts"
            value={warningCount}
            icon={<ExclamationCircleOutlined />}
            accent="#EF9F27"
            bg="#FFFBEB"
          />
        </Col>
      </Row>

      {/* Active sessions */}
      <Card
        style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: 20 } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Active Sessions</span>
            <span
              style={{
                background: '#E1F5EE',
                color: '#1D9E75',
                borderRadius: 20,
                padding: '1px 10px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {sessions.length}
            </span>
          </div>
        }
      >
        {sessions.length === 0 ? (
          <Empty description="No active sessions" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => navigate(`/sessions/${session.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                  background: '#fff',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#F0FDF9';
                  (e.currentTarget as HTMLElement).style.borderColor = '#1D9E75';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#fff';
                  (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="pulse-dot-wrap"><div className="pulse-dot-inner" /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                      Session {session.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {patientNames[session.patientId] ?? `Patient ${session.patientId.slice(0, 8)}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                    {new Date(session.startedAt).toLocaleTimeString()}
                  </Text>
                  <Tag
                    style={{
                      background: '#E1F5EE',
                      color: '#1D9E75',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    ACTIVE
                  </Tag>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alerts table */}
      <Card
        style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: 20 } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Alerts</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {filterButtons.map(({ key, label, cls }) => (
                <button
                  key={key}
                  className={`filter-btn ${alertFilter === key ? cls : ''}`}
                  onClick={() => setAlertFilter(key)}
                >
                  {label}
                </button>
              ))}
              <button
                className="filter-btn"
                onClick={() => setSortDesc((v) => !v)}
                title={sortDesc ? 'Newest first' : 'Oldest first'}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {sortDesc ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
                {sortDesc ? 'Newest' : 'Oldest'}
              </button>
            </div>
          </div>
        }
      >
        <Table
          dataSource={filteredAlerts}
          rowKey="id"
          size="small"
          pagination={false}
          className="teal-table"
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No alerts" /> }}
          columns={[
            {
              title: <span className="label-caps">Level</span>,
              dataIndex: 'level',
              width: 110,
              render: (l: string) => {
                const isC = l === 'CRITICAL';
                return (
                  <Tag
                    style={{
                      background: isC ? '#FEF2F2' : '#FFFBEB',
                      color: isC ? '#E24B4A' : '#EF9F27',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {l}
                  </Tag>
                );
              },
            },
            {
              title: <span className="label-caps">Message</span>,
              dataIndex: 'message',
              ellipsis: true,
            },
            {
              title: <span className="label-caps">Time</span>,
              dataIndex: 'createdAt',
              width: 160,
              render: (d: string) => (
                <span style={{ color: '#64748B', fontSize: 12 }}>
                  {new Date(d).toLocaleString()}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
