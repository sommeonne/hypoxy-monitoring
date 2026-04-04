import React, { useEffect } from 'react';
import { Row, Col, Card, Table, Tag, Typography, Empty, Spin } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActiveSessions } from '../api/sessions';
import { fetchUnacknowledgedAlerts, Alert } from '../api/alerts';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { on } = useSocket();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: fetchActiveSessions,
    refetchInterval: 10_000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['unacknowledgedAlerts'],
    queryFn: fetchUnacknowledgedAlerts,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const offM = on('measurement:new', () =>
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] }),
    );
    const offA = on('alert:new', () =>
      queryClient.invalidateQueries({ queryKey: ['unacknowledgedAlerts'] }),
    );
    return () => { offM(); offA(); };
  }, [on, queryClient]);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card><Title level={4} style={{ color: '#1890ff' }}>{sessions.length}</Title><p>Active Sessions</p></Card>
        </Col>
        <Col span={8}>
          <Card><Title level={4} style={{ color: '#ff4d4f' }}>{alerts.length}</Title><p>Unacknowledged Alerts</p></Card>
        </Col>
      </Row>

      <Card title="Active Sessions" style={{ marginBottom: 24 }}>
        {sessions.length === 0 ? (
          <Empty description="No active sessions" />
        ) : (
          <Row gutter={[16, 16]}>
            {sessions.map((session) => (
              <Col key={session.id} xs={24} md={12} lg={8}>
                <Card
                  hoverable size="small"
                  title={`Session ${session.id.slice(0, 8)}...`}
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  extra={<Tag color="green">ACTIVE</Tag>}
                >
                  <p>Patient: {session.patientId.slice(0, 8)}...</p>
                  <p>Started: {new Date(session.startedAt).toLocaleTimeString()}</p>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {alerts.length > 0 && (
        <Card title={`Unacknowledged Alerts (${alerts.length})`}>
          <Table
            dataSource={alerts.slice(0, 10)} rowKey="id" size="small" pagination={false}
            columns={[
              { title: 'Level', dataIndex: 'level', render: (l) => <Tag color={l === 'CRITICAL' ? 'red' : 'orange'}>{l}</Tag> },
              { title: 'Message', dataIndex: 'message', ellipsis: true },
              { title: 'Time', dataIndex: 'createdAt', render: (d) => new Date(d).toLocaleString() },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
