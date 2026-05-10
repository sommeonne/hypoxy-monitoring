import React, { useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Typography, Empty, Spin, Button } from 'antd';
import { MonitorOutlined, ArrowRightOutlined, AlertOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActiveSessions, Session } from '../api/sessions';
import { fetchPatients } from '../api/patients';
import { fetchAlerts } from '../api/alerts';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { on, joinSession, leaveSession } = useSocket();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: fetchActiveSessions,
    refetchInterval: 10_000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    staleTime: 60_000,
  });

  const patientNames = useMemo(
    () => Object.fromEntries(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`])),
    [patients],
  );
  const myPatientIds = useMemo(() => new Set(patients.map((p) => p.id)), [patients]);

  const { data: rawAlerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts(),
    refetchInterval: 15_000,
  });
  const alerts = rawAlerts.filter((a) => myPatientIds.has(a.patientId));
  const criticalCount = alerts.filter((a) => a.level === 'CRITICAL').length;

  useEffect(() => {
    sessions.forEach((s) => joinSession(s.id));
    return () => { sessions.forEach((s) => leaveSession(s.id)); };
  }, [sessions, joinSession, leaveSession]);

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

  const sessionColumns = [
    {
      title: <span className="label-caps">Patient</span>,
      dataIndex: 'patientId',
      render: (pid: string) => (
        <Text style={{ color: '#374151', fontSize: 13 }}>
          {patientNames[pid] ?? `—`}
        </Text>
      ),
    },
    {
      title: <span className="label-caps">Started</span>,
      dataIndex: 'startedAt',
      render: (d: string) => (
        <Text style={{ color: '#374151', fontSize: 13 }}>
          {new Date(d).toLocaleString()}
        </Text>
      ),
    },
    {
      title: <span className="label-caps">Status</span>,
      dataIndex: 'status',
      width: 100,
      render: (s: string) => (
        <Tag
          style={{
            background: s === 'active' ? '#E1F5EE' : '#F1F5F9',
            color: s === 'active' ? '#1D9E75' : '#64748B',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {s.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '',
      width: 80,
      render: (_: any, s: Session) => (
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate(`/sessions/${s.id}`)}
          style={{ color: '#1D9E75', fontWeight: 500 }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>Dashboard</h1>
        <Text style={{ color: '#64748B', fontSize: 13 }}>Real-time patient monitoring overview</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            style={{
              borderRadius: 12, border: '1px solid #E2E8F0',
              borderLeft: '4px solid #1D9E75', background: '#fff', boxShadow: 'none',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>Active Sessions</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1D9E75', lineHeight: 1 }}>
                  {sessions.length}
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#1D9E75' }}>
                <MonitorOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            style={{
              borderRadius: 12, border: '1px solid #E2E8F0',
              borderLeft: '4px solid #E24B4A', background: '#fff', boxShadow: 'none',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>Critical Alerts</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#E24B4A', lineHeight: 1 }}>
                  {criticalCount}
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#E24B4A' }}>
                <AlertOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: 20 } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Active Sessions</span>
            <span
              style={{
                background: '#E1F5EE', color: '#1D9E75',
                borderRadius: 20, padding: '1px 10px',
                fontSize: 12, fontWeight: 600,
              }}
            >
              {sessions.length}
            </span>
          </div>
        }
      >
        <Table
          dataSource={sessions}
          columns={sessionColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
          className="teal-table"
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active sessions" /> }}
          onRow={(s) => ({
            onClick: () => navigate(`/sessions/${s.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Card
        style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: 20 } }}
        title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Alerts</span>}
      >
        <Table
          dataSource={alerts}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, size: 'small', showTotal: (total) => `Total ${total}` }}
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
                      border: 'none', borderRadius: 6,
                      fontWeight: 600, fontSize: 11,
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
