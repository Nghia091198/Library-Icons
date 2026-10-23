import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Layout, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BRAND_LOGO_URL } from '@/client/common/brand';
import { DARK_COLOR } from '@/client/common/darkTheme';
import { useSiderOpen } from '@/client/common/useSiderOpen';

export const APP_HEADER_HEIGHT = 64;
const SIDER_WIDTH = 248;
const SIDER_ID = 'app-sider';

// Header của antd đặt line-height 64px; link phải có line-height riêng, nếu không nền active cao hơn header.
export const HEADER_LINK_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 8,
  lineHeight: '20px',
  fontWeight: 500,
} as const;

export function HeaderLink({ to, label, isActive }: { to: string; label: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      style={{
        ...HEADER_LINK_STYLE,
        color: isActive ? DARK_COLOR.text : DARK_COLOR.textMuted,
        background: isActive ? DARK_COLOR.surfaceRaised : 'transparent',
      }}
    >
      {label}
    </Link>
  );
}

interface AppShellProps {
  homePath: string;
  brandSuffix?: string;
  nav: ReactNode;
  actions?: ReactNode;
  // null: trang không có sidebar (ẩn luôn nút đóng/mở).
  sider: ReactNode | null;
  siderStorageKey: string;
  children: ReactNode;
}

// Khung trang dùng chung cho gallery và admin: header cố định, sidebar đóng/mở được, vùng nội dung.
export function AppShell({ homePath, brandSuffix, nav, actions, sider, siderStorageKey, children }: AppShellProps) {
  const siderState = useSiderOpen(siderStorageKey);
  const toggleLabel = siderState.isOpen ? 'Đóng menu' : 'Mở menu';
  const hasSider = sider !== null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: APP_HEADER_HEIGHT,
          padding: '0 16px',
          borderBottom: `1px solid ${DARK_COLOR.border}`,
          background: `${DARK_COLOR.background}e6`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {hasSider && (
          <Tooltip title={toggleLabel} placement="bottomLeft">
            <Button
              type="text"
              aria-label={toggleLabel}
              aria-expanded={siderState.isOpen}
              aria-controls={SIDER_ID}
              icon={siderState.isOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={siderState.toggle}
              style={{ color: DARK_COLOR.textMuted }}
            />
          </Tooltip>
        )}
        <Link to={homePath} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <img src={BRAND_LOGO_URL} width={30} height={30} alt="" />
          <Typography.Text strong style={{ fontSize: 17 }}>
            Lib Icons
          </Typography.Text>
          {brandSuffix && (
            <span
              style={{
                fontSize: 12,
                lineHeight: '20px',
                padding: '0 8px',
                borderRadius: 10,
                color: DARK_COLOR.link,
                border: `1px solid ${DARK_COLOR.border}`,
              }}
            >
              {brandSuffix}
            </span>
          )}
        </Link>
        <nav aria-label="Trang" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', minWidth: 0 }}>
          {nav}
        </nav>
        {actions}
      </Layout.Header>
      <Layout>
        {hasSider && (
          <Layout.Sider
            id={SIDER_ID}
            className="gallery-scroll"
            collapsible
            collapsed={!siderState.isOpen}
            trigger={null}
            breakpoint="lg"
            onBreakpoint={siderState.onBreakpoint}
            collapsedWidth={0}
            width={SIDER_WIDTH}
            style={{
              position: 'sticky',
              top: APP_HEADER_HEIGHT,
              height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
              overflowY: 'auto',
              overflowX: 'hidden',
              borderRight: siderState.isOpen ? `1px solid ${DARK_COLOR.border}` : 'none',
            }}
          >
            {sider}
          </Layout.Sider>
        )}
        <Layout.Content style={{ padding: 24, minWidth: 0 }}>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
