export const API_PREFIX = {
  root: '/api',
  public: '/api/v1',
  auth: '/api/auth',
  admin: '/api/admin',
} as const;

export const API_ROUTE = {
  health: `${API_PREFIX.public}/health`,
  publicIcons: `${API_PREFIX.public}/icons`,
  publicIconCategories: `${API_PREFIX.public}/icon-categories`,
  publicIconSets: `${API_PREFIX.public}/icon-sets`,
  authLogin: `${API_PREFIX.auth}/login`,
  authLogout: `${API_PREFIX.auth}/logout`,
  adminMe: `${API_PREFIX.admin}/me`,
  adminIconSets: `${API_PREFIX.admin}/icon-sets`,
  adminIconCategories: `${API_PREFIX.admin}/icon-categories`,
  adminIcons: `${API_PREFIX.admin}/icons`,
  adminIconsPreview: `${API_PREFIX.admin}/icons/preview`,
  adminIconsPublishDrafts: `${API_PREFIX.admin}/icons/publish-drafts`,
  docs: `${API_PREFIX.root}/docs`,
  openApiSpec: `${API_PREFIX.root}/openapi.json`,
} as const;

// Dạng {param} theo cú pháp OpenAPI; dùng fillRoute để tạo URL thật.
export const API_ROUTE_TEMPLATE = {
  adminIconSet: `${API_PREFIX.admin}/icon-sets/{id}`,
  adminIcon: `${API_PREFIX.admin}/icons/{id}`,
  adminIconSvg: `${API_PREFIX.admin}/icons/{id}/svg`,
  adminIconMoveSet: `${API_PREFIX.admin}/icons/{id}/move-set`,
  adminIconPublish: `${API_PREFIX.admin}/icons/{id}/publish`,
  adminIconArchive: `${API_PREFIX.admin}/icons/{id}/archive`,
  adminIconRestore: `${API_PREFIX.admin}/icons/{id}/restore`,
} as const;

export function fillRoute(template: string, params: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : encodeURIComponent(value);
  });
}

export function isApiPath(path: string): boolean {
  return path === API_PREFIX.root || path.startsWith(`${API_PREFIX.root}/`);
}
