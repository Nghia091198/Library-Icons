import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Layout, Tooltip, Typography } from 'antd';
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { SWRConfig, type SWRConfiguration } from 'swr';
import { BRAND_LOGO_URL } from '@/client/common/brand';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { MessageProvider } from '@/client/common/MessageProvider';
import { CategoryNav } from '@/client/gallery/CategoryNav';
import { CategoryMenuSkeleton } from '@/client/gallery/GallerySkeletons';
import { GALLERY_COLOR, GALLERY_THEME } from '@/client/gallery/galleryTheme';
import { GuideNav } from '@/client/gallery/GuideNav';
import { useGalleryCategories } from '@/client/gallery/useGallery';
import { useSiderOpen } from '@/client/gallery/useSiderOpen';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import type { IconCategoryDto } from '@/shared/types/icons';

const SIDER_WIDTH = 248;
const HEADER_HEIGHT = 64;
// Khoảng cách từ đáy header tới tiêu đề mục khi cuộn; khớp scroll-margin của từng mục trong trang hướng dẫn.
const GUIDE_ANCHOR_GAP = 24;
const CATEGORY_SKELETON_ROWS = 14;

// Dữ liệu thư viện ít thay đổi: không gọi lại khi đổi tab, gộp các lần gọi trùng trong 1 phút,
// giữ kết quả cũ trên màn hình trong lúc tải kết quả mới (đổi bộ lọc, gõ tìm kiếm) để không bị nháy.
const SWR_OPTIONS: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 60_000,
  keepPreviousData: true,
};

export interface GalleryContext {
  categories: IconCategoryDto[];
  totalCount: number;
  isLoadingCategories: boolean;
}

export function useGalleryContext(): GalleryContext {
  return useOutletContext<GalleryContext>();
}

// Header của antd đặt line-height 64px; link phải có line-height riêng, nếu không nền active cao hơn header.
const HEADER_LINK_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 8,
  lineHeight: '20px',
  fontWeight: 500,
} as const;

function HeaderLink({ to, label, isActive }: { to: string; label: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      style={{
        ...HEADER_LINK_STYLE,
        color: isActive ? GALLERY_COLOR.text : GALLERY_COLOR.textMuted,
        background: isActive ? GALLERY_COLOR.surfaceRaised : 'transparent',
      }}
    >
      {label}
    </Link>
  );
}

// Nền body phải tối theo, nếu không phần kéo quá đầu/cuối trang sẽ lộ màu sáng của admin.
function useDarkPageBackground(): void {
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = GALLERY_COLOR.background;
    return () => {
      document.body.style.background = previous;
    };
  }, []);
}

function GalleryShell() {
  const { pathname } = useLocation();
  const { categories, totalCount, isLoading } = useGalleryCategories();
  const sider = useSiderOpen();
  const context: GalleryContext = { categories, totalCount, isLoadingCategories: isLoading };
  const isGuide = pathname === CLIENT_ROUTE.galleryGuide;
  const toggleLabel = sider.isOpen ? 'Đóng menu' : 'Mở menu';
  useDarkPageBackground();

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
          height: HEADER_HEIGHT,
          padding: '0 16px',
          borderBottom: `1px solid ${GALLERY_COLOR.border}`,
          background: `${GALLERY_COLOR.background}e6`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Tooltip title={toggleLabel} placement="bottomLeft">
          <Button
            type="text"
            aria-label={toggleLabel}
            aria-expanded={sider.isOpen}
            aria-controls="gallery-sider"
            icon={sider.isOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={sider.toggle}
            style={{ color: GALLERY_COLOR.textMuted }}
          />
        </Tooltip>
        <Link to={CLIENT_ROUTE.gallery} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={BRAND_LOGO_URL} width={30} height={30} alt="" />
          <Typography.Text strong style={{ fontSize: 17 }}>
            Lib Icons
          </Typography.Text>
        </Link>
        <nav aria-label="Trang" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <HeaderLink to={CLIENT_ROUTE.gallery} label="Icons" isActive={!isGuide} />
          <HeaderLink to={CLIENT_ROUTE.galleryGuide} label="Hướng dẫn" isActive={isGuide} />
          <a href={API_ROUTE.docs} target="_blank" rel="noreferrer" style={{ ...HEADER_LINK_STYLE, color: GALLERY_COLOR.textMuted }}>
            API
          </a>
        </nav>
      </Layout.Header>
      <Layout>
        <Layout.Sider
          id="gallery-sider"
          className="gallery-scroll"
          collapsible
          collapsed={!sider.isOpen}
          trigger={null}
          breakpoint="lg"
          onBreakpoint={sider.onBreakpoint}
          collapsedWidth={0}
          width={SIDER_WIDTH}
          style={{
            position: 'sticky',
            top: HEADER_HEIGHT,
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRight: sider.isOpen ? `1px solid ${GALLERY_COLOR.border}` : 'none',
          }}
        >
          {isGuide ? (
            <GuideNav topOffset={HEADER_HEIGHT + GUIDE_ANCHOR_GAP} />
          ) : (
            <nav aria-label="Icon categories">
              {isLoading && categories.length === 0 ? (
                <CategoryMenuSkeleton count={CATEGORY_SKELETON_ROWS} />
              ) : (
                <CategoryNav categories={categories} totalCount={totalCount} activePath={pathname} />
              )}
            </nav>
          )}
        </Layout.Sider>
        <Layout.Content style={{ padding: 24, minWidth: 0 }}>
          <Outlet context={context} />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export function GalleryLayout() {
  return (
    <ConfigProvider theme={GALLERY_THEME}>
      <MessageProvider>
        <SWRConfig value={SWR_OPTIONS}>
          <GalleryShell />
        </SWRConfig>
      </MessageProvider>
    </ConfigProvider>
  );
}
