import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Tag, Table, Typography, Row, Col, Descriptions, Spin } from 'antd';
import { DownloadOutlined, StopOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSession, endSession } from '../api/sessions';
import { fetchSessionMeasurements, Measurement } from '../api/measurements';
import { fetchAlerts, acknowledgeAlert, Alert } from '../api/alerts';
import { useSocket } from '../hooks/useSocket';
import MeasurementChart from '../components/MeasurementChart';
import VitalSign from '../components/VitalSign';

const { Title } = Typography;

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { on } = useSocket();
  const [liveData, setLiveData] = useState<Measurement[]>([]);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id!),
    enabled: !!id,
  });

  const { data: measurements = [] } = useQuery({
    queryKey: ['sessionMeasurements', id],
    queryFn: () => fetchSessionMeasurements(id!),
    enabled: !!id,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['sessionAlerts', id, session?.patientId],
    queryFn: () => fetchAlerts({ patientId: session!.patientId }),
    enabled: !!session?.patientId,
  });

  useEffect(() => {
    if (measurements.length) setLiveData(measurements);
  }, [measurements]);

  const endMutation = useMutation({
    mutationFn: () => endSession(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', id] }),
  });

  const ackMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessionAlerts'] }),
  });

  useEffect(() => {
    return on('measurement:new', (m: Measurement) => {
      if (m.sessionId === id) setLiveData((prev) => [m, ...prev].slice(0, 500));
    });
  }, [on, id]);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!session) return <div>Session not found</div>;

  const displayData = liveData.length > 0 ? liveData : measurements;
  const latest = displayData[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Session Details</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<DownloadOutlined />} href={`/api/reports/session/${id}/pdf`} target="_blank">PDF</Button>
          <Button icon={<DownloadOutlined />} href={`/api/reports/session/${id}/excel`} target="_blank">Excel</Button>
          {session.status === 'active' && (
            <Button danger icon={<StopOutlined />} onClick={() => endMutation.mutate()} loading={endMutation.isPending}>
              End Session
            </Button>
          )}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Session Info">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <Tag color={session.status === 'active' ? 'green' : 'default'}>{session.status.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Started">{new Date(session.startedAt).toLocaleString()}</Descriptions.Item>
              {session.endedAt && <Descriptions.Item label="Ended">{new Date(session.endedAt).toLocaleString()}</Descriptions.Item>}
              {session.summary && (
                <>
                  <Descriptions.Item label="Duration">{session.summary.durationMinutes} min</Descriptions.Item>
                  <Descriptions.Item label="Measurements">{session.summary.totalMeasurements}</Descriptions.Item>
                  <Descriptions.Item label="Alerts">{session.summary.alertCount}</Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        </Col>
        {latest && (
          <Col xs={24} md={12}>
            <Card title="Latest Vitals">
              <VitalSign spo2={latest.spo2} heartRate={latest.heartRate} respiratoryRate={latest.respiratoryRate} />
            </Card>
          </Col>
        )}
      </Row>

      <Card title="Measurements Chart" style={{ marginTop: 16 }}>
        <MeasurementChart measurements={displayData} />
      </Card>

      <Card title={`Alerts (${alerts.length})`} style={{ marginTop: 16 }}>
        <Table
          dataSource={alerts} rowKey="id" size="small" pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Level', dataIndex: 'level', render: (l) => <Tag color={l === 'CRITICAL' ? 'red' : 'orange'}>{l}</Tag> },
            { title: 'Message', dataIndex: 'message', ellipsis: true },
            { title: 'Time', dataIndex: 'createdAt', render: (d) => new Date(d).toLocaleString() },
            {
              title: 'Status',
              render: (_: any, a: Alert) => a.acknowledged
                ? <Tag color="default">Acknowledged</Tag>
                : <Button size="small" onClick={() => ackMutation.mutate(a.id)}>Acknowledge</Button>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
