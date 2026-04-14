import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1D9E75',
            colorSuccess: '#1D9E75',
            colorWarning: '#EF9F27',
            colorError: '#E24B4A',
            colorLink: '#1D9E75',
            colorBgContainer: '#ffffff',
            colorBgLayout: '#F8FAFC',
            colorBorder: '#E2E8F0',
            colorBorderSecondary: '#E2E8F0',
            colorTextBase: '#1E293B',
            borderRadius: 12,
            borderRadiusSM: 8,
            borderRadiusLG: 12,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 13,
            fontSizeLG: 15,
            boxShadow: 'none',
            boxShadowSecondary: 'none',
          },
          components: {
            Layout: {
              headerBg: '#0F172A',
              bodyBg: '#F8FAFC',
              headerHeight: 60,
              headerPadding: '0 40px',
            },
            Menu: {
              darkItemBg: '#0F172A',
              darkItemHoverBg: 'rgba(29,158,117,0.12)',
              darkItemSelectedBg: 'transparent',
              darkItemSelectedColor: '#6EE7B7',
              darkItemColor: '#94A3B8',
              darkItemHoverColor: '#6EE7B7',
              horizontalItemSelectedColor: '#6EE7B7',
              activeBarBorderWidth: 2,
              activeBarColor: '#6EE7B7',
              itemHeight: 60,
            },
            Card: {
              boxShadow: 'none',
              boxShadowSecondary: 'none',
              borderRadiusLG: 12,
              paddingLG: 20,
              headerFontSize: 15,
              headerFontSizeSM: 13,
            },
            Button: {
              borderRadius: 8,
              borderRadiusSM: 6,
              colorPrimary: '#1D9E75',
              colorPrimaryHover: '#0F6E56',
              colorPrimaryActive: '#0F6E56',
              primaryShadow: 'none',
            },
            Table: {
              borderRadius: 12,
              headerBg: '#F8FAFC',
              headerColor: '#64748B',
              headerSplitColor: '#E2E8F0',
              rowHoverBg: '#F0FDF9',
              fontSize: 13,
            },
            Input: {
              borderRadius: 8,
              colorBorder: '#E2E8F0',
            },
            Select: {
              borderRadius: 8,
            },
            DatePicker: {
              borderRadius: 8,
            },
            Tag: {
              borderRadiusSM: 6,
            },
            Badge: {
              colorBgContainer: '#E24B4A',
            },
            Descriptions: {
              labelBg: '#F8FAFC',
            },
            Modal: {
              borderRadiusLG: 12,
            },
          },
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
