import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Popconfirm, Typography, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDoctors, createDoctor, deleteDoctor, Doctor } from '../api/doctors';

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

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: fetchDoctors,
  });
  const doctors = all.filter((d) => d.role === 'doctor');

  const createMutation = useMutation({
    mutationFn: createDoctor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setIsOpen(false);
      form.resetFields();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDoctor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctors'] }),
  });

  const columns = [
    {
      title: <span className="label-caps">Name</span>,
      render: (_: any, d: Doctor) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <InitialsAvatar name={`${d.firstName} ${d.lastName}`} />
          <div>
            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
              {d.firstName} {d.lastName}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: <span className="label-caps">Unified №</span>,
      dataIndex: 'unifiedNumber',
      render: (v: string) => (
        <Text style={{ color: '#64748B', fontSize: 13, fontFamily: 'monospace' }}>{v || '—'}</Text>
      ),
    },
    {
      title: <span className="label-caps">Email</span>,
      dataIndex: 'email',
      render: (v: string) => (
        <Text style={{ color: '#64748B', fontSize: 13 }}>{v || '—'}</Text>
      ),
    },
    {
      title: <span className="label-caps">Username</span>,
      dataIndex: 'username',
      render: (u: string) => (
        <Text style={{ color: '#64748B', fontSize: 13, fontFamily: 'monospace' }}>@{u}</Text>
      ),
    },
    {
      title: <span className="label-caps">Created</span>,
      dataIndex: 'createdAt',
      width: 130,
      render: (d: string) => (
        <Text style={{ color: '#64748B', fontSize: 12 }}>{new Date(d).toLocaleDateString()}</Text>
      ),
    },
    {
      title: '',
      width: 60,
      render: (_: any, d: Doctor) => (
        <Popconfirm
          title={
            <span style={{ fontWeight: 600, color: '#0F172A' }}>Delete doctor account?</span>
          }
          description={
            <span style={{ color: '#64748B', fontSize: 12 }}>
              This action cannot be undone.
            </span>
          }
          onConfirm={() => deleteMutation.mutate(d.id)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{
            style: { background: '#E24B4A', borderColor: '#E24B4A', fontWeight: 600 },
          }}
          placement="leftTop"
        >
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            className="delete-row-btn"
            style={{ color: '#94A3B8' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#E24B4A')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
          />
        </Popconfirm>
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
            Doctors
          </h1>
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            {doctors.length} account{doctors.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsOpen(true)}
          style={{ fontWeight: 600 }}
        >
          Add Doctor
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
          dataSource={doctors}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, size: 'small' }}
          className="teal-table"
        />
      </div>

      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
            Add Doctor Account
          </span>
        }
        open={isOpen}
        onCancel={() => { setIsOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create Account"
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75', fontWeight: 600 } }}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={(v) => createMutation.mutate(v)}
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
            name="unifiedNumber"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Unified Doctor Number</span>}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Email</span>}
            rules={[{ required: true }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input placeholder="doctor@hospital.com" />
          </Form.Item>
          <Form.Item
            name="username"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Username</span>}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Password</span>}
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
