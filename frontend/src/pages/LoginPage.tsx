import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

const { Title, Text } = Typography;

function HeartPulseLogo() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        background: '#E1F5EE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 18h4l3-7 4 14 3-10 2 3h8"
          stroke="#1D9E75"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 6C13 2 7 4 7 9c0 1.5.4 2.8 1.2 3.9"
          stroke="#1D9E75"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M16 6C19 2 25 4 25 9c0 1.5-.4 2.8-1.2 3.9"
          stroke="#1D9E75"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await login(values.username, values.password);
      localStorage.setItem('access_token', access_token);
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
        padding: '24px 16px',
      }}
    >
      <Card
        style={{
          width: 480,
          maxWidth: '100%',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
        }}
        styles={{ body: { padding: 40 } }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <HeartPulseLogo />
          <Title
            level={4}
            style={{
              margin: '0 0 4px',
              fontWeight: 700,
              color: '#0F172A',
              fontSize: 20,
            }}
          >
            Hypoxy Monitor
          </Title>
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            Sign in to the clinical dashboard
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
          <Form.Item
            name="username"
            label={<span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Username</span>}
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Enter username"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</span>}
            rules={[{ required: true, message: 'Please enter your password' }]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Enter password"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 44,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                background: '#1D9E75',
                borderColor: '#1D9E75',
              }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
