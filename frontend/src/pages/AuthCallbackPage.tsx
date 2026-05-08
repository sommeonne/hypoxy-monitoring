import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { isAdmin } from '../utils/auth';
import { exchangeCode } from '../api/auth';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    window.history.replaceState(null, '', window.location.pathname);

    exchangeCode(code)
      .then(({ access_token }) => {
        localStorage.setItem('access_token', access_token);
        navigate(isAdmin() ? '/users' : '/dashboard', { replace: true });
      })
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  );
}
