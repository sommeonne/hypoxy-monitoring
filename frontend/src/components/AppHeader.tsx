import React, { useState, useEffect } from 'react';
import { Layout, Menu, Badge, Avatar, Dropdown, notification } from 'antd';
import { BellOutlined, DashboardOutlined, TeamOutlined, MedicineBoxOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { isAdmin, getUsername, logout } from '../utils/auth';

const { Header } = Layout;

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { on } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    return on('alert:new', (alert: any) => {
      setUnreadCount((c) => c + 1);
      api.open({
        type: alert?.level === 'CRITICAL' ? 'error' : 'warning',
        message: alert?.level ?? 'Alert',
        description: alert?.message ?? 'A new alert was triggered.',
        placement: 'topRight',
        duration: 6,
      });
    });
  }, [on, api]);

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/patients', icon: <TeamOutlined />, label: 'Patients' },
    ...(isAdmin() ? [{ key: '/doctors', icon: <MedicineBoxOutlined />, label: 'Doctors' }] : []),
  ];

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        logout();
        navigate('/login', { replace: true });
      }
    },
  };

  return (
    <>
      {contextHolder}
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap' }}>
          Hypoxy Monitor
        </span>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1 }}
        />
        <Badge count={unreadCount} offset={[-4, 4]}>
          <BellOutlined
            style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }}
            onClick={() => setUnreadCount(0)}
          />
        </Badge>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Avatar
            icon={<UserOutlined />}
            style={{ cursor: 'pointer', backgroundColor: '#1677ff', marginLeft: 8 }}
            title={getUsername()}
          />
        </Dropdown>
      </Header>
    </>
  );
}
