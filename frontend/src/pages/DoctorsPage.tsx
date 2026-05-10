import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, deleteUser, User } from '../api/users';
import { fetchSpecializations } from '../api/specializations';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  const { data: specializations = [] } = useQuery({
    queryKey: ['specializations'],
    queryFn: fetchSpecializations,
  });
  const doctors = all.filter((d) => d.role === 'doctor');

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      createForm.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const openEdit = (user: User) => {
    setEditUser(user);
    editForm.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      specialization: user.specialization,
    });
  };

  const specializationOptions = specializations.map((s) => ({ value: s.name, label: s.name }));

  const columns = [
    {
      title: <span className="label-caps">Name</span>,
      render: (_: any, d: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <InitialsAvatar name={`${d.firstName} ${d.lastName}`} />
          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
            {d.firstName} {d.lastName}
          </div>
        </div>
      ),
    },
    {
      title: <span className="label-caps">Specialization</span>,
      dataIndex: 'specialization',
      render: (v: string) => (
        <Text style={{ color: '#64748B', fontSize: 13 }}>{v || '—'}</Text>
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
      title: <span className="label-caps">Created</span>,
      dataIndex: 'createdAt',
      width: 130,
      render: (d: string) => (
        <Text style={{ color: '#64748B', fontSize: 12 }}>{new Date(d).toLocaleDateString()}</Text>
      ),
    },
    {
      title: '',
      width: 80,
      render: (_: any, d: User) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            style={{ color: '#94A3B8' }}
            onClick={() => openEdit(d)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#1D9E75')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
          />
          <Popconfirm
            title={<span style={{ fontWeight: 600, color: '#0F172A' }}>Delete user account?</span>}
            description={<span style={{ color: '#64748B', fontSize: 12 }}>This action cannot be undone.</span>}
            onConfirm={() => deleteMutation.mutate(d.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ style: { background: '#E24B4A', borderColor: '#E24B4A', fontWeight: 600 } }}
            placement="leftTop"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              style={{ color: '#94A3B8' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#E24B4A')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const userFormFields = (
    <>
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
        name="specialization"
        label={<span style={{ fontWeight: 500, fontSize: 13 }}>Specialization</span>}
      >
        <Select
          placeholder="Select specialization"
          allowClear
          showSearch
          options={specializationOptions}
        />
      </Form.Item>
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Doctors</h1>
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            {doctors.length} account{doctors.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
          style={{ fontWeight: 600 }}
        >
          Add Doctor
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Table
          dataSource={doctors}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, size: 'small' }}
          className="teal-table"
        />
      </div>

      {/* Create modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>Add Doctor Account</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create Account"
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75', fontWeight: 600 } }}
      >
        <Form
          form={createForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={(v) => createMutation.mutate(v)}
          requiredMark={false}
        >
          {userFormFields}
          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Google Email</span>}
            rules={[{ required: true }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input placeholder="doctor@gmail.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
            Edit — {editUser?.firstName} {editUser?.lastName}
          </span>
        }
        open={!!editUser}
        onCancel={() => setEditUser(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        okText="Save"
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75', fontWeight: 600 } }}
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={(v) => updateMutation.mutate({ id: editUser!.id, data: v })}
          requiredMark={false}
        >
          {userFormFields}
          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Google Email</span>}
            rules={[{ required: true }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input placeholder="doctor@gmail.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
