import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { APP_HEADER_HEIGHT, AppShell, HEADER_LINK_STYLE, HeaderLink } from '@/client/common/AppShell';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { DARK_COLOR } from '@/client/common/darkTheme';
import { DarkThemeProvider } from '@/client/common/DarkThemeProvider';
import { NavSkeleton } from '@/client/common/NavSkeleton';
import { CategoryNav } from '@/client/gallery/CategoryNav';
import { GuideNav } from '@/client/gallery/GuideNav';
import { useGalleryCategories } from '@/client/gallery/useGallery';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import type { IconCategoryDto } from '@/shared/types/icons';

// Khoảng cách từ đáy header tới tiêu đề mục khi cuộn; khớp scroll-margin của từng mục trong trang hướng dẫn.
const GUIDE_ANCHOR_GAP = 24;
const CATEGORY_SKELETON_ROWS = 14;
const SIDER_STORAGE_KEY = 'lib-icons:gallery-sider-open';

export interface GalleryContext {
  categories: IconCategoryDto[];
  totalCount: number;
  isLoadingCategories: boolean;
}

export function useGalleryContext(): GalleryContext {
  return useOutletContext<GalleryContext>();
}

function GalleryShell() {
  const { pathname } = useLocation();
  const { categories, totalCount, isLoading } = useGalleryCategories();
  const context: GalleryContext = { categories, totalCount, isLoadingCategories: isLoading };
  const isGuide = pathname === CLIENT_ROUTE.galleryGuide;

  const sider = isGuide ? (
    <GuideNav topOffset={APP_HEADER_HEIGHT + GUIDE_ANCHOR_GAP} />
  ) : (
    <nav aria-label="Icon categories">
      {isLoading && categories.length === 0 ? (
        <NavSkeleton count={CATEGORY_SKELETON_ROWS} />
      ) : (
        <CategoryNav categories={categories} totalCount={totalCount} activePath={pathname} />
      )}
    </nav>
  );

  return (
    <AppShell
      homePath={CLIENT_ROUTE.gallery}
      siderStorageKey={SIDER_STORAGE_KEY}
      sider={sider}
      nav={
        <>
          <HeaderLink to={CLIENT_ROUTE.gallery} label="Icons" isActive={!isGuide} />
          <HeaderLink to={CLIENT_ROUTE.galleryGuide} label="Hướng dẫn" isActive={isGuide} />
          <a href={API_ROUTE.docs} target="_blank" rel="noreferrer" style={{ ...HEADER_LINK_STYLE, color: DARK_COLOR.textMuted }}>
            API
          </a>
        </>
      }
    >
      <Outlet context={context} />
    </AppShell>
  );
}

export function GalleryLayout() {
  return (
    <DarkThemeProvider>
      <GalleryShell />
    </DarkThemeProvider>
  );
}
