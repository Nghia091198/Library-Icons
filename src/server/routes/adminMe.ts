import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import { ErrorBodySchema } from '@/server/lib/httpError';
import { ADMIN_SECURITY_SCHEME, jsonContent, OPENAPI_TAG } from '@/server/openapi';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import type { AdminMeResponse } from '@/shared/types/api';

const AdminMeResponseSchema = z
  .object({ email: z.string().email() })
  .openapi('AdminMeResponse') satisfies z.ZodType<AdminMeResponse>;

const adminMeRoute = createRoute({
  method: 'get',
  path: API_ROUTE.adminMe,
  tags: [OPENAPI_TAG.admin],
  summary: 'Get the signed-in admin account',
  security: [{ [ADMIN_SECURITY_SCHEME]: [] }],
  responses: {
    200: { content: jsonContent(AdminMeResponseSchema), description: 'Signed-in admin' },
    401: { content: jsonContent(ErrorBodySchema), description: 'Admin session is missing, invalid or expired' },
  },
});

export function registerAdminMeRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(adminMeRoute, (c) => c.json({ email: c.get('adminEmail') }, 200));
}
