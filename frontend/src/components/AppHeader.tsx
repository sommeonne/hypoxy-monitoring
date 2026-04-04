import React, { useState, useEffect } from 'react';
import { Layout, Menu, Badge } from 'antd';
import { BellOutlined, DashboardOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

const { Header } = Layout;

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { on } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    return on('alert:new', () => setUnreadCount((c) => c + 1));
  }, [on]);

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/patients', icon: <TeamOutlined />, label: 'Patients' },
  ];

  return (
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
    </Header>
  );
}
