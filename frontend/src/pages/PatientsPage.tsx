import React, { useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Typography, Select, InputNumber, Space } from 'antd';
import { PlusOutlined, ArrowRightOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, createPatient, Patient } from '../api/patients';
import { getGroups } from '../utils/groups';
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

  const [nameSearch, setNameSearch] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const groups = getGroups();

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

  const filtered = useMemo(() => {
    const name = nameSearch.trim().toLowerCase();
    const card = cardSearch.trim().toLowerCase();
    return patients.filter((p) => {
      if (name && !`${p.firstName} ${p.lastName}`.toLowerCase().includes(name)) return false;
      if (card && !(p.cardNumber ?? '').toLowerCase().includes(card)) return false;
      if (groupFilter != null && p.group !== groupFilter) return false;
      return true;
    });
  }, [patients, nameSearch, cardSearch, groupFilter]);

  const columns = [
    {
      title: <span className="label-caps">Name</span>,
      render: (_: any, p: Patient) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <InitialsAvatar name={`${p.firstName} ${p.lastName}`} />
          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
            {p.firstName} {p.lastName}
          </div>
        </div>
      ),
    },
    {
      title: <span className="label-caps">Card №</span>,
      dataIndex: 'cardNumber',
      render: (v: string) => <Text style={{ color: '#64748B', fontSize: 13 }}>{v || '—'}</Text>,
    },
    {
      title: <span className="label-caps">Group</span>,
      dataIndex: 'group',
      width: 80,
      render: (v: number) => <Text style={{ color: '#64748B', fontSize: 13 }}>{v ?? '—'}</Text>,
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
          alignItems: 'flex-start',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
            Patients
          </h1>
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            {filtered.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
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

      {/* Filters */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          placeholder="Search by name..."
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
        <Input
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          placeholder="Search by card number..."
          value={cardSearch}
          onChange={(e) => setCardSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder="Group"
          value={groupFilter}
          onChange={(v) => setGroupFilter(v)}
          allowClear
          onClear={() => setGroupFilter(null)}
          style={{ width: 120 }}
        >
          {groups.map((g) => (
            <Select.Option key={g} value={g}>Group {g}</Select.Option>
          ))}
        </Select>
      </Space>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        <Table
          dataSource={filtered}
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
          <Form.Item
            name="cardNumber"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Card Number</span>}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="lastName"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Last Name</span>}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="firstName"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>First Name</span>}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="patronymic"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Patronymic</span>}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="group"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Group</span>}
              rules={[{ required: true }]}
            >
              <Select>
                {groups.map((g) => (
                  <Select.Option key={g} value={g}>{g}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="dateOfBirth"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Date of Birth</span>}
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="height"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Height (cm)</span>}
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={300} />
            </Form.Item>
            <Form.Item
              name="weight"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Weight (kg)</span>}
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={500} step={0.1} />
            </Form.Item>
            <Form.Item
              name="gender"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Gender</span>}
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="Male">Male</Select.Option>
                <Select.Option value="Female">Female</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="address"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Address</span>}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="phone"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Phone</span>}
              rules={[{ required: true }]}
            >
              <Input placeholder="+38(***) ***-**-**" />
            </Form.Item>
            <Form.Item
              name="email"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>Email</span>}
              rules={[{ required: true }, { type: 'email', message: 'Invalid email' }]}
            >
              <Input placeholder="example@email.com" />
            </Form.Item>
          </div>
          <Form.Item
            name="diagnosis"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Diagnosis</span>}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="notes"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Notes</span>}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
