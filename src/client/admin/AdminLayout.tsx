import { ExportOutlined, LogoutOutlined } from '@ant-design/icons';
import { Alert, Button, Flex, Spin, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminFilterNav } from '@/client/admin/icons/AdminFilterNav';
import { ADMIN_SESSION_STATUS, useAdminSession } from '@/client/admin/useAdminSession';
import { AppShell, HEADER_LINK_STYLE, HeaderLink } from '@/client/common/AppShell';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { DARK_COLOR } from '@/client/common/darkTheme';
import { DarkThemeProvider } from '@/client/common/DarkThemeProvider';

const SIDER_STORAGE_KEY = 'lib-icons:admin-sider-open';

function CenteredState({ children }: { children: ReactNode }) {
  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', padding: 24 }}>
      {children}
    </Flex>
  );
}

function AdminShell() {
  const { pathname } = useLocation();
  const { session, signOut } = useAdminSession();

  switch (session.status) {
    case ADMIN_SESSION_STATUS.loading:
      return (
        <CenteredState>
          <Spin tip="Đang kiểm tra đăng nhập…">
            <div style={{ width: 120, height: 60 }} />
          </Spin>
        </CenteredState>
      );
    case ADMIN_SESSION_STATUS.signedOut:
      return <Navigate to={CLIENT_ROUTE.adminLogin} replace />;
    case ADMIN_SESSION_STATUS.failed:
      return (
        <CenteredState>
          <Alert
            type="error"
            showIcon
            message="Không xác minh được phiên đăng nhập"
            description={`${session.message}. Nếu server vừa khởi động lại, đợi vài giây rồi thử lại.`}
            action={
              <Button size="small" onClick={() => window.location.reload()}>
                Thử lại
              </Button>
            }
          />
        </CenteredState>
      );
    case ADMIN_SESSION_STATUS.ready: {
      const isIconsPage = pathname === CLIENT_ROUTE.adminIcons;
      return (
        <AppShell
          homePath={CLIENT_ROUTE.adminIcons}
          brandSuffix="Admin"
          siderStorageKey={SIDER_STORAGE_KEY}
          sider={isIconsPage ? <AdminFilterNav /> : null}
          nav={
            <>
              <HeaderLink to={CLIENT_ROUTE.adminIcons} label="Icons" isActive={isIconsPage} />
              <HeaderLink to={CLIENT_ROUTE.adminUpload} label="Upload" isActive={pathname === CLIENT_ROUTE.adminUpload} />
              <a href={CLIENT_ROUTE.gallery} target="_blank" rel="noreferrer" style={{ ...HEADER_LINK_STYLE, color: DARK_COLOR.textMuted }}>
                Gallery <ExportOutlined aria-label="mở tab mới" />
              </a>
            </>
          }
          actions={
            <Flex align="center" gap={8} style={{ marginLeft: 8, paddingLeft: 12, borderLeft: `1px solid ${DARK_COLOR.border}` }}>
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
                {session.email}
              </Typography.Text>
              <Tooltip title="Đăng xuất">
                <Button type="text" aria-label="Đăng xuất" icon={<LogoutOutlined />} onClick={() => void signOut()} />
              </Tooltip>
            </Flex>
          }
        >
          <Outlet />
        </AppShell>
      );
    }
  }
}

export function AdminLayout() {
  return (
    <DarkThemeProvider>
      <AdminShell />
    </DarkThemeProvider>
  );
}
