import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Typography, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, createPatient, Patient } from '../api/patients';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export default function PatientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: patients = [], isLoading } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsOpen(false);
      form.resetFields();
    },
  });

  const columns = [
    { title: 'Name', render: (_: any, p: Patient) => `${p.firstName} ${p.lastName}` },
    { title: 'Date of Birth', dataIndex: 'dateOfBirth', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Diagnosis', dataIndex: 'diagnosis', render: (d: string) => d || '—' },
    { title: 'Registered', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: '', render: (_: any, p: Patient) => <Button type="link" onClick={() => navigate(`/patients/${p.id}`)}>View</Button> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Patients</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsOpen(true)}>Add Patient</Button>
      </div>

      <Table dataSource={patients} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />

      <Modal title="Register New Patient" open={isOpen} onCancel={() => setIsOpen(false)} onOk={() => form.submit()} confirmLoading={mutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate({ ...v, dateOfBirth: v.dateOfBirth.format('YYYY-MM-DD') })}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="diagnosis" label="Diagnosis"><Input /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
