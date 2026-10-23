import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import type { IconService } from '@/server/icons/iconService';
import { errorResponse, jsonContent, OPENAPI_TAG } from '@/server/openapi';
import {
  IconCategoryListSchema,
  IconSetListSchema,
  PublicIconListSchema,
  PublicListIconsQuerySchema,
} from '@/server/routes/admin/iconSchemas';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import { ICON_STATUS } from '@/shared/constants/icons';

const tags = [OPENAPI_TAG.public];
const tooManyRequests = errorResponse('Rate limit exceeded');

const listIconsRoute = createRoute({
  method: 'get',
  path: API_ROUTE.publicIcons,
  tags,
  summary: 'List published icons',
  description: 'Only published icons are returned. Filter by category slug, set and search text.',
  request: { query: PublicListIconsQuerySchema },
  responses: {
    200: { content: jsonContent(PublicIconListSchema), description: 'A page of published icons' },
    422: errorResponse('Query is invalid'),
    429: tooManyRequests,
  },
});

const listCategoriesRoute = createRoute({
  method: 'get',
  path: API_ROUTE.publicIconCategories,
  tags,
  summary: 'List icon categories with the number of published icons',
  responses: {
    200: { content: jsonContent(IconCategoryListSchema), description: 'Categories in display order' },
    429: tooManyRequests,
  },
});

const listSetsRoute = createRoute({
  method: 'get',
  path: API_ROUTE.publicIconSets,
  tags,
  summary: 'List icon sets (styles)',
  responses: {
    200: { content: jsonContent(IconSetListSchema), description: 'All icon sets' },
    429: tooManyRequests,
  },
});

export function registerPublicIconRoutes(app: OpenAPIHono<AppEnv>, service: IconService): void {
  app.openapi(listIconsRoute, async (c) => c.json(await service.listPublicIcons(c.req.valid('query')), 200));
  app.openapi(listCategoriesRoute, async (c) => c.json(await service.listCategories([ICON_STATUS.published]), 200));
  app.openapi(listSetsRoute, async (c) => c.json({ items: await service.listSets() }, 200));
}
