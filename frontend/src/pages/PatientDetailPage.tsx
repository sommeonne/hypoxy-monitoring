import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Button, Typography, Tag, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatient } from '../api/patients';
import { fetchPatientSessions, startSession, Session } from '../api/sessions';

const { Title } = Typography;

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

  if (patLoading || sessLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!patient) return <div>Patient not found</div>;

  const hasActiveSession = sessions.some((s) => s.status === 'active');

  const sessionColumns = [
    { title: 'Started', dataIndex: 'startedAt', render: (d: string) => new Date(d).toLocaleString() },
    { title: 'Ended', dataIndex: 'endedAt', render: (d: string) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s.toUpperCase()}</Tag> },
    { title: 'Duration', render: (_: any, s: Session) => s.summary ? `${s.summary.durationMinutes} min` : '—' },
    { title: '', render: (_: any, s: Session) => <Button type="link" onClick={() => navigate(`/sessions/${s.id}`)}>View</Button> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>{patient.firstName} {patient.lastName}</Title>
        <Button type="primary" onClick={() => startMutation.mutate()} loading={startMutation.isPending} disabled={hasActiveSession}>
          Start Session
        </Button>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="First Name">{patient.firstName}</Descriptions.Item>
          <Descriptions.Item label="Last Name">{patient.lastName}</Descriptions.Item>
          <Descriptions.Item label="Date of Birth">{new Date(patient.dateOfBirth).toLocaleDateString()}</Descriptions.Item>
          <Descriptions.Item label="Diagnosis">{patient.diagnosis || '—'}</Descriptions.Item>
          <Descriptions.Item label="Notes" span={2}>{patient.notes || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Session History">
        <Table dataSource={sessions} columns={sessionColumns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}
