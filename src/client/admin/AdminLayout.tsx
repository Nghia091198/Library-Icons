import { AppstoreOutlined, CloudUploadOutlined, ExportOutlined, LogoutOutlined } from '@ant-design/icons';
import { Alert, Button, Flex, Layout, Menu, Spin, theme, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_SESSION_STATUS, useAdminSession } from '@/client/admin/useAdminSession';
import { BRAND_LOGO_URL } from '@/client/common/brand';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';

const SIDER_WIDTH = 220;

const MENU_ITEMS: MenuProps['items'] = [
  { key: CLIENT_ROUTE.adminIcons, icon: <AppstoreOutlined />, label: 'Quản lý icon' },
  { key: CLIENT_ROUTE.adminUpload, icon: <CloudUploadOutlined />, label: 'Upload' },
  {
    key: 'gallery',
    icon: <ExportOutlined />,
    label: (
      <a href={CLIENT_ROUTE.gallery} target="_blank" rel="noreferrer">
        Xem gallery
      </a>
    ),
  },
];

function BrandMark() {
  return (
    <Flex align="center" gap={10} style={{ height: 64, padding: '0 24px' }}>
      <img src={BRAND_LOGO_URL} width={28} height={28} alt="" />
      <span style={{ color: '#ffffff', fontSize: 17, fontWeight: 600 }}>Lib Icons</span>
    </Flex>
  );
}

export function AdminLayout() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session, signOut } = useAdminSession();

  switch (session.status) {
    case ADMIN_SESSION_STATUS.loading:
      return (
        <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
          <Spin tip="Đang kiểm tra đăng nhập…">
            <div style={{ width: 120, height: 60 }} />
          </Spin>
        </Flex>
      );
    case ADMIN_SESSION_STATUS.signedOut:
      return <Navigate to={CLIENT_ROUTE.adminLogin} replace />;
    case ADMIN_SESSION_STATUS.failed:
      return (
        <Flex align="center" justify="center" style={{ minHeight: '100vh', padding: 24 }}>
          <Alert type="error" showIcon message="Không xác minh được phiên đăng nhập" description={session.message} />
        </Flex>
      );
    case ADMIN_SESSION_STATUS.ready:
      return (
        <Layout style={{ minHeight: '100vh' }}>
          <Layout.Sider
            breakpoint="lg"
            collapsedWidth={0}
            width={SIDER_WIDTH}
            style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
          >
            <BrandMark />
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[pathname]}
              items={MENU_ITEMS}
              onClick={({ key }) => {
                if (key.startsWith('/')) navigate(key);
              }}
            />
          </Layout.Sider>
          <Layout>
            <Layout.Header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
                padding: '0 24px',
                background: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Typography.Text>{session.email}</Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={() => void signOut()}>
                Đăng xuất
              </Button>
            </Layout.Header>
            <Layout.Content style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <Outlet />
            </Layout.Content>
          </Layout>
        </Layout>
      );
  }
}
