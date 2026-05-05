import React from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
  MonitorOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAdmin, getUsername, logout } from '../utils/auth';
import AlertPanel from './AlertPanel';

const { Header } = Layout;

/* Teal pulse/heart SVG logo icon */
function HeartPulseIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <circle cx="14" cy="14" r="14" fill="rgba(29,158,117,0.15)" />
      <path
        d="M5 15h3l2-5 3 10 2-8 2 3h6"
        stroke="#1D9E75"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/dashboard', icon: <MonitorOutlined />, label: 'Dashboard' },
    { key: '/patients', icon: <TeamOutlined />, label: 'Patients' },
    ...(isAdmin() ? [
      { key: '/users', icon: <MedicineBoxOutlined />, label: 'Doctors' },
      { key: '/admin-settings', icon: <SettingOutlined />, label: 'Admin Settings' },
    ] : []),
  ];

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true }],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        logout();
        navigate('/login', { replace: true });
      }
    },
  };

  const username = getUsername();
  const initials = username ? username.slice(0, 2).toUpperCase() : 'U';

  return (
    <>
      <AlertPanel />
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#0F172A',
          padding: '0 40px',
          height: 60,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo — left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            minWidth: 180,
            flexShrink: 0,
          }}
          onClick={() => navigate('/dashboard')}
        >
          <HeartPulseIcon />
          <span
            style={{
              color: '#F1F5F9',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            Hypoxy Monitor
          </span>
        </div>

        {/* Nav — center */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            fontSize: 13,
          }}
        />

        {/* Right controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            minWidth: 180,
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <Dropdown menu={userMenu} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  'rgba(255,255,255,0.06)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'transparent')
              }
            >
              <Avatar
                size={32}
                style={{
                  backgroundColor: '#1D9E75',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {initials}
              </Avatar>
              <span style={{ color: '#CBD5E1', fontSize: 13, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>
    </>
  );
}
