import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import { ADMIN_SESSION_COOKIE } from '@/server/auth/adminSession';
import { ErrorBodySchema } from '@/server/lib/httpError';
import { API_ROUTE } from '@/shared/constants/apiRoutes';

export const ADMIN_SECURITY_SCHEME = 'adminSession';

export const OPENAPI_TAG = {
  system: 'System',
  public: 'Public · Icons',
  auth: 'Auth',
  admin: 'Admin',
  iconSets: 'Admin · Icon sets',
  icons: 'Admin · Icons',
} as const;

export function jsonContent<TSchema>(schema: TSchema) {
  return { 'application/json': { schema } };
}

export function errorResponse(description: string) {
  return { content: jsonContent(ErrorBodySchema), description };
}

export function registerOpenApiSecurity(app: OpenAPIHono<AppEnv>): void {
  app.openAPIRegistry.registerComponent('securitySchemes', ADMIN_SECURITY_SCHEME, {
    type: 'apiKey',
    in: 'cookie',
    name: ADMIN_SESSION_COOKIE,
    description: `Session cookie được đặt sau khi gọi POST ${API_ROUTE.authLogin}`,
  });
}
