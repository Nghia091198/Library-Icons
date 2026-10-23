import { Flex, Spin } from 'antd';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { GalleryLayout } from '@/client/gallery/GalleryLayout';
import { GalleryPage } from '@/client/gallery/GalleryPage';

const GuidePage = lazy(() => import('@/client/gallery/GuidePage').then((module) => ({ default: module.GuidePage })));

const AdminLayout = lazy(() => import('@/client/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminLoginPage = lazy(() =>
  import('@/client/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })),
);
const IconManagementPage = lazy(() =>
  import('@/client/admin/icons/IconManagementPage').then((module) => ({ default: module.IconManagementPage })),
);
const UploadPage = lazy(() => import('@/client/admin/upload/UploadPage').then((module) => ({ default: module.UploadPage })));

function PageLoading() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: '60vh' }}>
      <Spin />
    </Flex>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path={CLIENT_ROUTE.adminLogin} element={<AdminLoginPage />} />
          <Route path={CLIENT_ROUTE.admin} element={<AdminLayout />}>
            <Route index element={<Navigate to={CLIENT_ROUTE.adminIcons} replace />} />
            <Route path={CLIENT_ROUTE.adminIcons} element={<IconManagementPage />} />
            <Route path={CLIENT_ROUTE.adminUpload} element={<UploadPage />} />
            <Route path="*" element={<Navigate to={CLIENT_ROUTE.adminIcons} replace />} />
          </Route>
          <Route path={CLIENT_ROUTE.gallery} element={<GalleryLayout />}>
            <Route index element={<GalleryPage />} />
            <Route path={CLIENT_ROUTE.galleryGuide} element={<GuidePage />} />
            <Route path={CLIENT_ROUTE.galleryCategory} element={<GalleryPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
