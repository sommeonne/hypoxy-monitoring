import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Typography, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDoctors, createDoctor, deleteDoctor, Doctor } from '../api/doctors';

const { Title } = Typography;

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: fetchDoctors,
  });

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
      title: 'Name',
      render: (_: any, d: Doctor) => `${d.firstName} ${d.lastName}`,
    },
    {
      title: 'Username',
      dataIndex: 'username',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: '',
      render: (_: any, d: Doctor) => (
        <Popconfirm
          title="Delete this doctor account?"
          onConfirm={() => deleteMutation.mutate(d.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Doctors</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsOpen(true)}>
          Add Doctor
        </Button>
      </div>

      <Table
        dataSource={doctors}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Add Doctor Account"
        open={isOpen}
        onCancel={() => { setIsOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Space style={{ width: '100%' }} direction="vertical" size={0}>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="role" label="Role" initialValue="doctor">
              <Select options={[{ value: 'doctor', label: 'Doctor' }, { value: 'admin', label: 'Admin' }]} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
