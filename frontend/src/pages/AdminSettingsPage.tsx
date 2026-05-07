import React, { useState } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Popconfirm, Typography, Space, InputNumber,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, deleteUser, User } from '../api/users';
import { fetchGroups, createGroup, deleteGroup } from '../api/groups';
import { fetchSpecializations, createSpecialization, deleteSpecialization } from '../api/specializations';

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
        width: 32, height: 32, borderRadius: '50%',
        background: '#FEF2F2', color: '#E24B4A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function AdminsTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const admins = [...all.filter((d) => d.role === 'admin')]
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));

  const createMutation = useMutation({
    mutationFn: (v: any) => createUser({ ...v, role: 'admin' }),
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
    editForm.setFieldsValue({ firstName: user.firstName, lastName: user.lastName });
  };

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
            title={<span style={{ fontWeight: 600, color: '#0F172A' }}>Delete admin account?</span>}
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

  const nameFields = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
      <Form.Item name="firstName" label={<span style={{ fontWeight: 500, fontSize: 13 }}>First Name</span>} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="lastName" label={<span style={{ fontWeight: 500, fontSize: 13 }}>Last Name</span>} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: '#64748B', fontSize: 13 }}>
          {admins.length} admin account{admins.length !== 1 ? 's' : ''}
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ fontWeight: 600 }}>
          Add Admin
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Table
          dataSource={admins}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, size: 'small' }}
          className="teal-table"
        />
      </div>

      {/* Create modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>Add Admin Account</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create Account"
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75', fontWeight: 600 } }}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }} onFinish={(v) => createMutation.mutate(v)} requiredMark={false}>
          {nameFields}
          <Form.Item name="email" label={<span style={{ fontWeight: 500, fontSize: 13 }}>Google Email</span>} rules={[{ required: true }, { type: 'email', message: 'Invalid email' }]}>
            <Input placeholder="admin@gmail.com" />
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
          {nameFields}
        </Form>
      </Modal>
    </div>
  );
}

function GroupsTab() {
  const queryClient = useQueryClient();
  const [newGroup, setNewGroup] = useState<number | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
  });

  const groupNumbers = groups.map((g) => g.number);

  const addMutation = useMutation({
    mutationFn: (n: number) => createGroup(n),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setNewGroup(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });

  const handleAdd = () => {
    if (newGroup == null) return;
    addMutation.mutate(newGroup);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <InputNumber
          min={1}
          max={999}
          value={newGroup}
          onChange={(v) => setNewGroup(v)}
          placeholder="Group number"
          style={{ width: 160 }}
          onPressEnter={handleAdd}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          loading={addMutation.isPending}
          disabled={newGroup == null || groupNumbers.includes(newGroup)}
          style={{ fontWeight: 600 }}
        >
          Add Group
        </Button>
      </div>

      {isLoading ? null : groups.length === 0 ? (
        <Text style={{ color: '#94A3B8' }}>No groups defined.</Text>
      ) : (
        <Space wrap size={[10, 10]}>
          {groups.map(({ id, number: g }) => (
            <div
              key={id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 8, padding: '6px 12px',
              }}
            >
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>Group {g}</span>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => deleteMutation.mutate(id)}
                style={{ color: '#94A3B8', padding: 0, height: 20 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#E24B4A')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
              />
            </div>
          ))}
        </Space>
      )}
    </div>
  );
}

function SpecializationsTab() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: specializations = [], isLoading } = useQuery({
    queryKey: ['specializations'],
    queryFn: fetchSpecializations,
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => createSpecialization(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specializations'] });
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSpecialization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['specializations'] }),
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  const names = specializations.map((s) => s.name.toLowerCase());

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleAdd}
          placeholder="Specialization name"
          style={{ width: 240 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          loading={addMutation.isPending}
          disabled={!newName.trim() || names.includes(newName.trim().toLowerCase())}
          style={{ fontWeight: 600 }}
        >
          Add
        </Button>
      </div>

      {isLoading ? null : specializations.length === 0 ? (
        <Text style={{ color: '#94A3B8' }}>No specializations defined.</Text>
      ) : (
        <Space wrap size={[10, 10]}>
          {specializations.map(({ id, name }) => (
            <div
              key={id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 8, padding: '6px 12px',
              }}
            >
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>{name}</span>
              <Popconfirm
                title={<span style={{ fontWeight: 600, color: '#0F172A' }}>Delete specialization?</span>}
                description={<span style={{ color: '#64748B', fontSize: 12 }}>This action cannot be undone.</span>}
                onConfirm={() => deleteMutation.mutate(id)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ style: { background: '#E24B4A', borderColor: '#E24B4A', fontWeight: 600 } }}
                placement="top"
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{ color: '#94A3B8', padding: 0, height: 20 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#E24B4A')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
                />
              </Popconfirm>
            </div>
          ))}
        </Space>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 24px' }}>
        Admin Settings
      </h1>
      <Tabs
        defaultActiveKey="admins"
        items={[
          { key: 'admins', label: 'Admins', children: <AdminsTab /> },
          { key: 'specializations', label: 'Specializations', children: <SpecializationsTab /> },
          { key: 'groups', label: 'Groups', children: <GroupsTab /> },
        ]}
      />
    </div>
  );
}
