import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Tag, Table, Typography, Row, Col, Descriptions, Spin } from 'antd';
import { DownloadOutlined, StopOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSession, endSession } from '../api/sessions';
import { fetchSessionMeasurements, Measurement } from '../api/measurements';
import { fetchAlerts, Alert } from '../api/alerts';
import { useSocket } from '../hooks/useSocket';
import MeasurementChart from '../components/MeasurementChart';
import VitalSign from '../components/VitalSign';

const { Text } = Typography;

type AlertFilter = 'ALL' | 'CRITICAL' | 'WARNING';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{children}</span>
  );
}

function LevelTag({ level }: { level: string }) {
  const isC = level === 'CRITICAL';
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
      {level}
    </Tag>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { on } = useSocket();
  const [liveData, setLiveData] = useState<Measurement[]>([]);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('ALL');
  const [sortDesc, setSortDesc] = useState(true);

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
    queryKey: ['sessionAlerts', id],
    queryFn: () => fetchAlerts({ sessionId: id! }),
    enabled: !!id,
  });

  useEffect(() => {
    if (measurements.length) setLiveData(measurements);
  }, [measurements]);

  const endMutation = useMutation({
    mutationFn: () => {
      const data = liveData.length > 0 ? liveData : measurements;
      const summary = data.length > 0
        ? {
            totalMeasurements: data.length,
            alertCount: alerts.length,
            avgSpo2: Math.round((data.reduce((s, m) => s + m.spo2, 0) / data.length) * 10) / 10,
            avgHeartRate: Math.round((data.reduce((s, m) => s + m.heartRate, 0) / data.length) * 10) / 10,
            avgRespiratoryRate: Math.round((data.reduce((s, m) => s + m.respiratoryRate, 0) / data.length) * 10) / 10,
            minSpo2: Math.min(...data.map((m) => m.spo2)),
            maxHeartRate: Math.max(...data.map((m) => m.heartRate)),
          }
        : { totalMeasurements: 0, alertCount: alerts.length };
      return endSession(id!, summary);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', id] }),
  });

  useEffect(() => {
    return on('measurement:new', (m: Measurement) => {
      if (m.sessionId === id) setLiveData((prev) => [m, ...prev].slice(0, 500));
    });
  }, [on, id]);

  if (isLoading)
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!session)
    return <div style={{ padding: 32, color: '#64748B' }}>Session not found</div>;

  const displayData = liveData.length > 0 ? liveData : measurements;
  const latest = displayData[0];

  const criticalCount = alerts.filter((a) => a.level === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.level === 'WARNING').length;

  const filteredAlerts = alerts
    .filter((a) => alertFilter === 'ALL' || a.level === alertFilter)
    .sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortDesc ? diff : -diff;
    });

  const alertFilterButtons: { key: AlertFilter; label: string; cls: string }[] = [
    { key: 'ALL', label: `All (${alerts.length})`, cls: 'f-all' },
    { key: 'CRITICAL', label: `Critical (${criticalCount})`, cls: 'f-critical' },
    { key: 'WARNING', label: `Warning (${warningCount})`, cls: 'f-warning' },
  ];

  const isActive = session.status === 'active';

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
            Session Details
          </h1>
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            ID: {id?.slice(0, 16)}…
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            icon={<DownloadOutlined />}
            href={`/api/reports/session/${id}/pdf`}
            target="_blank"
            style={{ borderColor: '#E2E8F0', color: '#374151' }}
          >
            PDF
          </Button>
          <Button
            icon={<DownloadOutlined />}
            href={`/api/reports/session/${id}/excel`}
            target="_blank"
            style={{ borderColor: '#E2E8F0', color: '#374151' }}
          >
            Excel
          </Button>
          {isActive && (
            <Button
              icon={<StopOutlined />}
              onClick={() => endMutation.mutate()}
              loading={endMutation.isPending}
              style={{
                background: '#FEF2F2',
                borderColor: '#E24B4A',
                color: '#E24B4A',
                fontWeight: 600,
              }}
            >
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Session info + latest vitals */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={10}>
          <Card
            title={<SectionTitle>Session Info</SectionTitle>}
            style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none', height: '100%' }}
            styles={{ body: { padding: 20 } }}
          >
            <Descriptions column={1} size="small" labelStyle={{ color: '#64748B', fontSize: 12 }}>
              <Descriptions.Item label="Status">
                <Tag
                  style={{
                    background: isActive ? '#E1F5EE' : '#F1F5F9',
                    color: isActive ? '#1D9E75' : '#64748B',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  {session.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Started">
                {new Date(session.startedAt).toLocaleString()}
              </Descriptions.Item>
              {session.endedAt && (
                <Descriptions.Item label="Ended">
                  {new Date(session.endedAt).toLocaleString()}
                </Descriptions.Item>
              )}
              {session.summary && (
                <>
                  <Descriptions.Item label="Duration">{session.summary.durationMinutes} min</Descriptions.Item>
                  <Descriptions.Item label="Measurements">{session.summary.totalMeasurements}</Descriptions.Item>
                  <Descriptions.Item label="Alerts">{alerts.length}</Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        </Col>

        {latest && (
          <Col xs={24} md={14}>
            <Card
              title={<SectionTitle>Latest Vitals</SectionTitle>}
              style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none', height: '100%' }}
              styles={{ body: { padding: 20 } }}
            >
              <VitalSign
                spo2={latest.spo2}
                heartRate={latest.heartRate}
                respiratoryRate={latest.respiratoryRate}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Chart */}
      <Card
        title={<SectionTitle>Measurements Chart</SectionTitle>}
        style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: '8px 20px 20px' } }}
        extra={
          <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 20, height: 2, background: '#EF9F27', display: 'inline-block', borderTop: '2px dashed #EF9F27' }} />
              <span style={{ color: '#64748B' }}>90% threshold</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 20, height: 2, display: 'inline-block', borderTop: '2px dashed #E24B4A' }} />
              <span style={{ color: '#64748B' }}>85% critical</span>
            </span>
          </div>
        }
      >
        <MeasurementChart measurements={displayData} />
      </Card>

      {/* Alerts table */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SectionTitle>Alerts</SectionTitle>
              <span
                style={{
                  background: alerts.length > 0 ? '#FEF2F2' : '#F1F5F9',
                  color: alerts.length > 0 ? '#E24B4A' : '#64748B',
                  borderRadius: 20,
                  padding: '1px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {alerts.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {alertFilterButtons.map(({ key, label, cls }) => (
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
        style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: 20 } }}
      >
        <Table
          dataSource={filteredAlerts}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          className="teal-table"
          columns={[
            {
              title: <span className="label-caps">Level</span>,
              dataIndex: 'level',
              width: 130,
              render: (l: string) => <LevelTag level={l} />,
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
