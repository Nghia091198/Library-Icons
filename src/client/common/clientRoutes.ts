export const CLIENT_ROUTE = {
  gallery: '/',
  galleryGuide: '/guide',
  galleryCategory: '/:categorySlug',
  admin: '/admin',
  adminLogin: '/admin/login',
  adminIcons: '/admin/icons',
  adminUpload: '/admin/upload',
} as const;

export function galleryCategoryPath(categorySlug: string): string {
  return `/${encodeURIComponent(categorySlug)}`;
}
