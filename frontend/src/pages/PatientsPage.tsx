import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Typography } from 'antd';
import { PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, createPatient, Patient } from '../api/patients';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#E1F5EE',
        color: '#1D9E75',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsOpen(false);
      form.resetFields();
    },
  });

  const columns = [
    {
      title: <span className="label-caps">Name</span>,
      render: (_: any, p: Patient) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <InitialsAvatar name={`${p.firstName} ${p.lastName}`} />
          <div>
            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
              {p.firstName} {p.lastName}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: <span className="label-caps">Date of Birth</span>,
      dataIndex: 'dateOfBirth',
      render: (d: string) => (
        <Text style={{ color: '#64748B', fontSize: 13 }}>{new Date(d).toLocaleDateString()}</Text>
      ),
    },
    {
      title: <span className="label-caps">Diagnosis</span>,
      dataIndex: 'diagnosis',
      render: (d: string) => (
        <Text style={{ color: d ? '#374151' : '#CBD5E1', fontSize: 13 }}>{d || '—'}</Text>
      ),
    },
    {
      title: <span className="label-caps">Registered</span>,
      dataIndex: 'createdAt',
      render: (d: string) => (
        <Text style={{ color: '#64748B', fontSize: 12 }}>{new Date(d).toLocaleDateString()}</Text>
      ),
    },
    {
      title: '',
      width: 80,
      render: (_: any, p: Patient) => (
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate(`/patients/${p.id}`)}
          style={{ color: '#1D9E75', fontWeight: 500 }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
            Patients
          </h1>
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            {patients.length} registered patient{patients.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsOpen(true)}
          style={{ fontWeight: 600 }}
        >
          Add Patient
        </Button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        <Table
          dataSource={patients}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, size: 'small' }}
          className="teal-table"
          onRow={(p) => ({
            onClick: () => navigate(`/patients/${p.id}`),
            style: { cursor: 'pointer' },
          })}
          style={{ borderRadius: 12 }}
        />
      </div>

      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
            Register New Patient
          </span>
        }
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
        okText="Register"
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75', fontWeight: 600 } }}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={(v) =>
            mutation.mutate({ ...v, dateOfBirth: v.dateOfBirth.format('YYYY-MM-DD') })
          }
          requiredMark={false}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="firstName"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>First Name</span>}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="lastName"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Last Name</span>}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </div>
          <Form.Item
            name="dateOfBirth"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Date of Birth</span>}
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="diagnosis"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Diagnosis</span>}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="notes"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Notes</span>}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
