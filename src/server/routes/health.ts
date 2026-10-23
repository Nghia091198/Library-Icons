import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import { jsonContent, OPENAPI_TAG } from '@/server/openapi';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import type { HealthResponse } from '@/shared/types/api';

const HealthResponseSchema = z
  .object({ status: z.literal('ok') })
  .openapi('HealthResponse') satisfies z.ZodType<HealthResponse>;

const healthRoute = createRoute({
  method: 'get',
  path: API_ROUTE.health,
  tags: [OPENAPI_TAG.system],
  summary: 'Check that the API server is running',
  responses: {
    200: { content: jsonContent(HealthResponseSchema), description: 'Server is running' },
  },
});

export function registerHealthRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(healthRoute, (c) => c.json({ status: 'ok' as const }, 200));
}
