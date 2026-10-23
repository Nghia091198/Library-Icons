import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import type { IconService } from '@/server/icons/iconService';
import { ADMIN_SECURITY_SCHEME, errorResponse, jsonContent, OPENAPI_TAG } from '@/server/openapi';
import {
  AdminIconStatsSchema,
  CreateIconSetSchema,
  IconCategoryListSchema,
  IconSetListSchema,
  IconSetSchema,
  IdParamSchema,
  UpdateIconSetSchema,
} from '@/server/routes/admin/iconSchemas';
import { API_ROUTE, API_ROUTE_TEMPLATE } from '@/shared/constants/apiRoutes';

const security = [{ [ADMIN_SECURITY_SCHEME]: [] }];
const tags = [OPENAPI_TAG.iconSets];

const listSetsRoute = createRoute({
  method: 'get',
  path: API_ROUTE.adminIconSets,
  tags,
  security,
  summary: 'List icon sets',
  responses: {
    200: { content: jsonContent(IconSetListSchema), description: 'All icon sets' },
    401: errorResponse('Admin session required'),
  },
});

const listCategoriesRoute = createRoute({
  method: 'get',
  path: API_ROUTE.adminIconCategories,
  tags,
  security,
  summary: 'List icon categories with the number of active icons in each',
  responses: {
    200: { content: jsonContent(IconCategoryListSchema), description: 'All categories, in display order' },
    401: errorResponse('Admin session required'),
  },
});

const statsRoute = createRoute({
  method: 'get',
  path: API_ROUTE.adminIconStats,
  tags,
  security,
  summary: 'Icon counts by status and by set, for the admin sidebar',
  responses: {
    200: { content: jsonContent(AdminIconStatsSchema), description: 'Library counts' },
    401: errorResponse('Admin session required'),
  },
});

const createSetRoute = createRoute({
  method: 'post',
  path: API_ROUTE.adminIconSets,
  tags,
  security,
  summary: 'Create an icon set',
  request: { body: { content: jsonContent(CreateIconSetSchema), required: true } },
  responses: {
    201: { content: jsonContent(IconSetSchema), description: 'Created icon set' },
    401: errorResponse('Admin session required'),
    409: errorResponse('Slug already used by another set'),
    422: errorResponse('Request body is invalid'),
  },
});

const updateSetRoute = createRoute({
  method: 'patch',
  path: API_ROUTE_TEMPLATE.adminIconSet,
  tags,
  security,
  summary: 'Update the name or description of an icon set',
  description: 'Slug, style and stroke width are fixed once a set exists, because every icon in it was normalized with them.',
  request: { params: IdParamSchema, body: { content: jsonContent(UpdateIconSetSchema), required: true } },
  responses: {
    200: { content: jsonContent(IconSetSchema), description: 'Updated icon set' },
    401: errorResponse('Admin session required'),
    404: errorResponse('Icon set not found'),
    422: errorResponse('Request body is invalid'),
  },
});

export function registerAdminIconSetRoutes(app: OpenAPIHono<AppEnv>, service: IconService): void {
  app.openapi(listSetsRoute, async (c) => c.json({ items: await service.listSets() }, 200));
  app.openapi(listCategoriesRoute, async (c) => c.json(await service.listCategories(), 200));
  app.openapi(statsRoute, async (c) => c.json(await service.getAdminStats(), 200));

  app.openapi(createSetRoute, async (c) => {
    const set = await service.createSet(c.req.valid('json'), c.get('adminEmail'));
    return c.json(set, 201);
  });

  app.openapi(updateSetRoute, async (c) => {
    const set = await service.updateSet(c.req.valid('param').id, c.req.valid('json'), c.get('adminEmail'));
    return c.json(set, 200);
  });
}
