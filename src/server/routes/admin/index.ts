import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import type { IconService } from '@/server/icons/iconService';
import { registerAdminIconRoutes } from '@/server/routes/admin/adminIcons';
import { registerAdminIconSetRoutes } from '@/server/routes/admin/adminIconSets';

export function registerAdminIcons(app: OpenAPIHono<AppEnv>, service: IconService): void {
  registerAdminIconSetRoutes(app, service);
  registerAdminIconRoutes(app, service);
}
