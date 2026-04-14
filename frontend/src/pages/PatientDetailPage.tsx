import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Button, Tag, Spin, Typography } from 'antd';
import { PlayCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatient } from '../api/patients';
import { fetchPatientSessions, startSession, Session } from '../api/sessions';

const { Text } = Typography;

function PatientAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#E1F5EE',
        color: '#1D9E75',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{children}</span>;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: patient, isLoading: patLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id!),
    enabled: !!id,
  });

  const { data: sessions = [], isLoading: sessLoading } = useQuery({
    queryKey: ['patientSessions', id],
    queryFn: () => fetchPatientSessions(id!),
    enabled: !!id,
  });

  const startMutation = useMutation({
    mutationFn: () => startSession({ patientId: id! }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['patientSessions', id] });
      navigate(`/sessions/${session.id}`);
    },
  });

  if (patLoading || sessLoading)
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!patient)
    return <div style={{ padding: 32, color: '#64748B' }}>Patient not found</div>;

  const hasActiveSession = sessions.some((s) => s.status === 'active');

  const sessionColumns = [
    {
      title: <span className="label-caps">Started</span>,
      dataIndex: 'startedAt',
      render: (d: string) => (
        <Text style={{ color: '#374151', fontSize: 13 }}>{new Date(d).toLocaleString()}</Text>
      ),
    },
    {
      title: <span className="label-caps">Ended</span>,
      dataIndex: 'endedAt',
      render: (d: string) =>
        d ? (
          <Text style={{ color: '#374151', fontSize: 13 }}>{new Date(d).toLocaleString()}</Text>
        ) : (
          <Text style={{ color: '#CBD5E1' }}>—</Text>
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
      title: <span className="label-caps">Duration</span>,
      width: 100,
      render: (_: any, s: Session) => (
        <Text style={{ color: '#64748B', fontSize: 13 }}>
          {s.summary ? `${s.summary.durationMinutes} min` : '—'}
        </Text>
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
      {/* Patient header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <PatientAvatar firstName={patient.firstName} lastName={patient.lastName} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>
              {patient.firstName} {patient.lastName}
            </h1>
            <Text style={{ color: '#64748B', fontSize: 13 }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              {hasActiveSession && (
                <span
                  style={{
                    marginLeft: 8,
                    background: '#E1F5EE',
                    color: '#1D9E75',
                    borderRadius: 20,
                    padding: '1px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Active
                </span>
              )}
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={() => startMutation.mutate()}
          loading={startMutation.isPending}
          disabled={hasActiveSession}
          style={{ fontWeight: 600 }}
        >
          Start Session
        </Button>
      </div>

      {/* Patient info */}
      <Card
        title={<SectionTitle>Patient Information</SectionTitle>}
        style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: 20 } }}
      >
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          labelStyle={{ color: '#64748B', fontSize: 12, fontWeight: 500 }}
          contentStyle={{ color: '#0F172A', fontSize: 13 }}
        >
          <Descriptions.Item label="First Name">{patient.firstName}</Descriptions.Item>
          <Descriptions.Item label="Last Name">{patient.lastName}</Descriptions.Item>
          <Descriptions.Item label="Date of Birth">
            {new Date(patient.dateOfBirth).toLocaleDateString()}
          </Descriptions.Item>
          <Descriptions.Item label="Diagnosis">{patient.diagnosis || '—'}</Descriptions.Item>
          <Descriptions.Item label="Notes" span={2}>
            <Text style={{ color: patient.notes ? '#0F172A' : '#CBD5E1' }}>
              {patient.notes || '—'}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Session history */}
      <Card
        title={<SectionTitle>Session History</SectionTitle>}
        style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }}
        styles={{ body: { padding: 20 } }}
      >
        <Table
          dataSource={sessions}
          columns={sessionColumns}
          rowKey="id"
          pagination={{ pageSize: 10, size: 'small' }}
          className="teal-table"
          onRow={(s) => ({
            onClick: () => navigate(`/sessions/${s.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}
