import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Tag, Table, Typography, Row, Col, Descriptions, Spin, Input, Modal, Badge, message } from 'antd';
import { DownloadOutlined, StopOutlined, SortAscendingOutlined, SortDescendingOutlined, FileTextOutlined, MailOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSession, endSession, updateSessionNotes } from '../api/sessions';
import { fetchSessionMeasurements, Measurement } from '../api/measurements';
import { fetchAlerts, Alert } from '../api/alerts';
import { useSocket } from '../hooks/useSocket';
import MeasurementChart from '../components/MeasurementChart';
import LatestVitals from '../components/LatestVitals';

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
  const [news2Score, setNews2Score] = useState<number | undefined>();
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('ALL');
  const [sortDesc, setSortDesc] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

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

  useEffect(() => {
    if (!id) return;
    const draft = localStorage.getItem(`session-note-draft-${id}`);
    if (draft !== null) {
      setNoteText(draft);
      setHasDraft(draft !== (session?.notes ?? ''));
    } else if (session?.notes != null) {
      setNoteText(session.notes);
    }
  }, [id, session?.notes]);

  const notesMutation = useMutation({
    mutationFn: () => updateSessionNotes(id!, noteText),
    onSuccess: () => {
      localStorage.removeItem(`session-note-draft-${id}`);
      setHasDraft(false);
      queryClient.invalidateQueries({ queryKey: ['patientSessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      setNoteModalOpen(false);
    },
  });

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
            ...(news2Score != null && { news2Score }),
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

  useEffect(() => {
    return on('alert:new', (a: Alert) => {
      if (a.sessionId === id) {
        queryClient.invalidateQueries({ queryKey: ['sessionAlerts', id] });
      }
    });
  }, [on, id, queryClient]);

  useEffect(() => {
    return on('analysis:result', (r: { sessionId: string; news2Score: number }) => {
      if (r.sessionId === id) setNews2Score(r.news2Score);
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

  async function sendReport(sessionId: string) {
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/reports/session/${sessionId}/email`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || res.statusText);
      }
      message.success('Report sent to patient email');
    } catch (e: any) {
      message.error(e?.message ?? 'Failed to send report');
    } finally {
      setSendingEmail(false);
    }
  }

  async function downloadReport(sessionId: string, format: 'pdf' | 'excel') {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`/api/reports/session/${sessionId}/${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
            style={{ borderColor: '#E2E8F0', color: '#374151' }}
            onClick={() => downloadReport(id!, 'pdf')}
          >
            PDF
          </Button>
          <Button
            icon={<DownloadOutlined />}
            style={{ borderColor: '#E2E8F0', color: '#374151' }}
            onClick={() => downloadReport(id!, 'excel')}
          >
            Excel
          </Button>
          <Button
            icon={<MailOutlined />}
            loading={sendingEmail}
            style={{ borderColor: '#E2E8F0', color: '#374151' }}
            onClick={() => sendReport(id!)}
          >
            Send Report
          </Button>
          <Badge dot={hasDraft} color="#EF9F27" offset={[-4, 4]}>
            <Button
              icon={<FileTextOutlined />}
              style={{ borderColor: '#E2E8F0', color: '#374151' }}
              onClick={() => setNoteModalOpen(true)}
            >
              Note
            </Button>
          </Badge>
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

      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
            Session Note
            {hasDraft && (
              <span style={{ color: '#EF9F27', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                Draft
              </span>
            )}
          </span>
        }
        open={noteModalOpen}
        onCancel={() => {
          const savedNotes = session?.notes ?? '';
          if (noteText !== savedNotes) {
            localStorage.setItem(`session-note-draft-${id}`, noteText);
            setHasDraft(true);
          } else {
            localStorage.removeItem(`session-note-draft-${id}`);
            setHasDraft(false);
          }
          setNoteModalOpen(false);
        }}
        onOk={() => notesMutation.mutate()}
        okText="Save Note"
        confirmLoading={notesMutation.isPending}
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75', fontWeight: 600 } }}
        destroyOnClose={false}
        centered
      >
        <Input.TextArea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add session notes here…"
          autoSize={{ minRows: 4, maxRows: 12 }}
          style={{ fontSize: 14, color: '#0F172A', resize: 'none', marginTop: 8 }}
        />
      </Modal>

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
                  {session.lastNews2Score != null && (
                    <Descriptions.Item label="NEWS2 Score">
                      {session.lastNews2Score} / 9
                    </Descriptions.Item>
                  )}
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
              <LatestVitals
                vitals={{
                  spo2:         latest.spo2,
                  heartRate:    latest.heartRate,
                  respRate:     latest.respiratoryRate,
                  o2:           latest.o2Percentage,
                  news2Score: news2Score ?? session.lastNews2Score,
                  updatedAt:    latest.createdAt,
                  trends: (() => {
                    const win = [...displayData].slice(0, 20).reverse();
                    return {
                      spo2:      win.map(m => m.spo2),
                      heartRate: win.map(m => m.heartRate),
                      respRate:  win.map(m => m.respiratoryRate),
                      o2:        win.some(m => m.o2Percentage != null)
                                   ? win.map(m => m.o2Percentage ?? 0)
                                   : undefined,
                    };
                  })(),
                }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* 4 metric charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card
            title={<SectionTitle>SpO₂ (%)</SectionTitle>}
            style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            <MeasurementChart
              measurements={displayData}
              metric="spo2"
              color="#1D9E75"
              name="SpO₂"
              unit="%"
              domain={[70, 100]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<SectionTitle>Heart Rate (bpm)</SectionTitle>}
            style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            <MeasurementChart
              measurements={displayData}
              metric="heartRate"
              color="#E24B4A"
              name="HR"
              unit=""
              domain={[40, 180]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<SectionTitle>Respiratory Rate (/min)</SectionTitle>}
            style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            <MeasurementChart
              measurements={displayData}
              metric="respiratoryRate"
              color="#7F77DD"
              name="RR"
              unit=""
              domain={[8, 40]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<SectionTitle>O₂ Concentration (%)</SectionTitle>}
            style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            <MeasurementChart
              measurements={displayData}
              metric="o2Percentage"
              color="#3B82F6"
              name="O₂"
              unit="%"
              domain={[9, 22]}
              referenceValue={session.o2Percentage}
              referenceLabel={session.o2Percentage ? `Set: ${session.o2Percentage}%` : undefined}
              referenceColor="#F59E0B"
            />
          </Card>
        </Col>
      </Row>

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
