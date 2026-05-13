import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Spin, Input, Modal, Badge, message } from 'antd';
import {
  DownloadOutlined,
  StopOutlined,
  FileTextOutlined,
  MailOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSession, endSession, updateSessionNotes } from '../api/sessions';
import { fetchSessionMeasurements, Measurement } from '../api/measurements';
import { fetchAlerts } from '../api/alerts';
import { fetchPatient } from '../api/patients';
import { useSocket } from '../hooks/useSocket';
import MeasurementChart from '../components/MeasurementChart';
import SessionAlertsCard from '../components/SessionAlertsCard';


type ChartTabKey = 'spo2' | 'heartRate' | 'respRate' | 'o2' | 'tidalVolume';

const CHART_TABS: {
  key: ChartTabKey;
  label: string;
  metric: 'spo2' | 'heartRate' | 'respiratoryRate' | 'o2Percentage' | 'tidalVolume';
  color: string;
  unit: string;
  name: string;
  domain: [number, number];
}[] = [
  { key: 'spo2',       label: 'SpO₂',       metric: 'spo2',            color: '#1D9E75', unit: '%',   name: 'SpO₂', domain: [70, 100]  },
  { key: 'heartRate',  label: 'Heart rate',  metric: 'heartRate',       color: '#E24B4A', unit: 'bpm', name: 'HR',   domain: [40, 180]  },
  { key: 'respRate',   label: 'Resp. rate',  metric: 'respiratoryRate', color: '#7F77DD', unit: '/min',name: 'RR',   domain: [8, 40]    },
  { key: 'o2',         label: 'O₂ conc.',    metric: 'o2Percentage',    color: '#3B82F6', unit: '%',   name: 'O₂',   domain: [9, 22]    },
  { key: 'tidalVolume',label: 'Tidal vol.',  metric: 'tidalVolume',     color: '#F59E0B', unit: ' mL', name: 'TV',   domain: [200, 1000]},
];


function formatCountdown(seconds: number): string {
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const s = (abs % 60).toString().padStart(2, '0');
  return `${seconds < 0 ? '-' : ''}${m}:${s}`;
}

// ─── Tiny card shell ──────────────────────────────────────────────────────────

function SCard({ title, children, titleRight }: { title: React.ReactNode; children: React.ReactNode; titleRight?: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '9px 14px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        {titleRight}
      </div>
      {children}
    </div>
  );
}

// ─── Sidebar meta row ─────────────────────────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <span style={{ fontSize: 12, color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#0F172A', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

// ─── Sidebar vital row ────────────────────────────────────────────────────────

function SideVital({ name, value, unit }: { name: string; value: React.ReactNode; unit: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        background: '#F8FAFC',
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 11, color: '#64748B', width: 76, flexShrink: 0 }}>{name}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', flex: 1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {value} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>{unit}</span>
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { on, joinSession, leaveSession } = useSocket();

  const [liveData, setLiveData] = useState<Measurement[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [chartTab, setChartTab] = useState<ChartTabKey>('spo2');

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id!),
    enabled: !!id,
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', session?.patientId],
    queryFn: () => fetchPatient(session!.patientId),
    enabled: !!session?.patientId,
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

  const deleteNoteMutation = useMutation({
    mutationFn: () => updateSessionNotes(id!, ''),
    onSuccess: () => {
      localStorage.removeItem(`session-note-draft-${id}`);
      setNoteText('');
      setHasDraft(false);
      queryClient.invalidateQueries({ queryKey: ['patientSessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      setNoteModalOpen(false);
    },
  });

  const endMutation = useMutation({
    mutationFn: () => endSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
  });

  useEffect(() => {
    if (!id) return;
    joinSession(id);
    return () => leaveSession(id);
  }, [id, joinSession, leaveSession]);

  useEffect(() => {
    return on('measurement:new', (m: Measurement) => {
      if (m.sessionId === id) setLiveData((prev) => [m, ...prev].slice(0, 500));
    });
  }, [on, id]);

  useEffect(() => {
    if (!session || session.status !== 'active' || !session.plannedDurationSeconds) {
      setRemainingSeconds(null);
      return;
    }

    const calcRemaining = () => {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      return session.plannedDurationSeconds! - elapsed;
    };

    setRemainingSeconds(calcRemaining());

    const interval = setInterval(() => {
      setRemainingSeconds(calcRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.id, session?.status, session?.plannedDurationSeconds, session?.startedAt]);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!session) return <div style={{ padding: 32, color: '#64748B' }}>Session not found</div>;

  const displayData = liveData.length > 0 ? liveData : measurements;
  const latest = displayData[0];
  const isActive = session.status === 'active';

  const activeTabCfg = CHART_TABS.find((t) => t.key === chartTab)!;

  const conclusion = !isActive ? (session.conclusion ?? undefined) : undefined;

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

  const statusStyle = isActive
    ? { background: '#E1F5EE', color: '#1D9E75' }
    : { background: '#F1F5F9', color: '#64748B' };

  return (
    <div>
      {/* ── Top bar ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 500, color: '#0F172A' }}>Session details</span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {id?.slice(0, 14)}…
          </span>
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
          <Badge dot={hasDraft} color="#EF9F27" offset={[-4, 4]}>
            <Button
              icon={<FileTextOutlined />}
              style={{ borderColor: '#E2E8F0', color: '#374151' }}
              onClick={() => setNoteModalOpen(true)}
            >
              Note
            </Button>
          </Badge>
          <Button
            icon={<MailOutlined />}
            loading={sendingEmail}
            style={{ borderColor: '#E2E8F0', color: '#374151' }}
            onClick={() => sendReport(id!)}
          >
            Send report
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
              End session
            </Button>
          )}
        </div>
      </div>

      {/* ── Two-column layout ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14, alignItems: 'start' }}>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Session info */}
          <SCard title="Session info">
            <div style={{ padding: '10px 14px' }}>
              <MetaRow label="Status">
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, ...statusStyle }}>
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </span>
              </MetaRow>
              <MetaRow label="Started">
                {new Date(session.startedAt).toLocaleTimeString()}
              </MetaRow>
              {session.endedAt && (
                <MetaRow label="Ended">
                  {new Date(session.endedAt).toLocaleTimeString()}
                </MetaRow>
              )}
              {session.plannedDurationSeconds != null && (
                <MetaRow label="Planned">
                  {formatCountdown(session.plannedDurationSeconds)}
                </MetaRow>
              )}
              {isActive && remainingSeconds !== null && (
                <MetaRow label="Remaining">
                  <span
                    style={{
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color:
                        remainingSeconds <= 0
                          ? '#E24B4A'
                          : remainingSeconds <= 30
                          ? '#E24B4A'
                          : remainingSeconds <= 60
                          ? '#EF9F27'
                          : '#1D9E75',
                    }}
                  >
                    {remainingSeconds <= 0
                      ? `Overtime ${formatCountdown(remainingSeconds)}`
                      : formatCountdown(remainingSeconds)}
                  </span>
                </MetaRow>
              )}
              {session.endedAt && (
                <MetaRow label="Duration">
                  {formatCountdown(
                    Math.floor(
                      (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
                    ),
                  )}
                </MetaRow>
              )}
              <MetaRow label="Measurements">
                {session.summary?.totalMeasurements ?? displayData.length}
              </MetaRow>
              <MetaRow label="Alerts">
                <span style={{ color: alerts.length > 0 ? '#E24B4A' : '#0F172A', fontWeight: 600 }}>
                  {alerts.length}
                </span>
              </MetaRow>
            </div>
          </SCard>

          {/* Latest vitals */}
          {latest && (
            <SCard title="Latest vitals">
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SideVital name="SpO₂"       value={latest.spo2}               unit="%" />
                <SideVital name="Tidal vol." value={latest.tidalVolume ?? '—'}  unit="mL" />
                <SideVital name="Heart rate" value={latest.heartRate}            unit="bpm" />
                <SideVital name="Resp. rate" value={latest.respiratoryRate}      unit="/min" />
                {latest.o2Percentage != null && (
                  <SideVital name="O₂ conc." value={latest.o2Percentage} unit="%" />
                )}
              </div>
            </SCard>
          )}

          {/* Conclusion */}
          <SCard title="Conclusion">
            <div style={{ padding: '12px 14px' }}>
              {conclusion ? (
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{conclusion}</p>
              ) : (
                <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.6, fontStyle: 'italic' }}>
                  Available after session ends
                </p>
              )}
            </div>
          </SCard>
        </div>

        {/* ── Main ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Tabbed chart */}
          <SCard
            title="Vitals over time"
            titleRight={
              <div style={{ display: 'flex', gap: 4 }}>
                {CHART_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setChartTab(tab.key)}
                    style={{
                      fontSize: 11,
                      padding: '3px 9px',
                      borderRadius: 4,
                      border: '1px solid',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.12s',
                      borderColor: chartTab === tab.key ? '#CBD5E1' : '#E2E8F0',
                      background: chartTab === tab.key ? '#F1F5F9' : 'transparent',
                      color: chartTab === tab.key ? '#0F172A' : '#64748B',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          >
            <div style={{ padding: '12px 14px 8px' }}>
              {displayData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
                  No measurements yet
                </div>
              ) : (
                <MeasurementChart
                  measurements={displayData}
                  metric={activeTabCfg.metric}
                  color={activeTabCfg.color}
                  name={activeTabCfg.name}
                  unit={activeTabCfg.unit}
                  domain={activeTabCfg.domain}
                  height={220}
                  {...(activeTabCfg.key === 'o2' && session.o2Percentage
                    ? {
                        referenceValue: session.o2Percentage,
                        referenceLabel: `Set: ${session.o2Percentage}%`,
                        referenceColor: '#F59E0B',
                      }
                    : {})}
                />
              )}
            </div>
          </SCard>

          <SessionAlertsCard sessionId={id!} />
        </div>
      </div>

      {/* ── Note modal ─────────────────────────────────────────── */}
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
        footer={(_, { OkBtn, CancelBtn }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              icon={<DeleteOutlined />}
              danger
              loading={deleteNoteMutation.isPending}
              disabled={!session?.notes}
              onClick={() => deleteNoteMutation.mutate()}
            >
              Delete Note
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <CancelBtn />
              <OkBtn />
            </div>
          </div>
        )}
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
    </div>
  );
}
