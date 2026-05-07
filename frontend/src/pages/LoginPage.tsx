import React from 'react';
import { Button, Card, Typography } from 'antd';
import { redirectToGoogle } from '../api/auth';

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
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
          width: 400,
          maxWidth: '100%',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
        }}
        styles={{ body: { padding: 40 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <HeartPulseLogo />
          <Title
            level={4}
            style={{ margin: '0 0 4px', fontWeight: 700, color: '#0F172A', fontSize: 20 }}
          >
            Hypoxy Monitor
          </Title>
          <Text style={{ color: '#64748B', fontSize: 13 }}>
            Sign in to the clinical dashboard
          </Text>
        </div>

        <Button
          block
          size="large"
          icon={<GoogleIcon />}
          onClick={redirectToGoogle}
          style={{
            height: 44,
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            border: '1px solid #E2E8F0',
            color: '#374151',
          }}
        >
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
}
