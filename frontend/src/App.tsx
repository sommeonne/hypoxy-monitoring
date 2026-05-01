import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import SessionDetailPage from './pages/SessionDetailPage';
import DoctorsPage from './pages/DoctorsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import LoginPage from './pages/LoginPage';
import { isLoggedIn, isAdmin } from './utils/auth';

const { Content } = Layout;

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <PrivateRoute>
            <Layout style={{ minHeight: '100vh', background: '#F8FAFC' }}>
              <AppHeader />
              <Content>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px', width: '100%' }}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/patients" element={<PatientsPage />} />
                    <Route path="/patients/:id" element={<PatientDetailPage />} />
                    <Route path="/sessions/:id" element={<SessionDetailPage />} />
                    <Route path="/doctors" element={<AdminRoute><DoctorsPage /></AdminRoute>} />
                    <Route path="/admin-settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
                  </Routes>
                </div>
              </Content>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
