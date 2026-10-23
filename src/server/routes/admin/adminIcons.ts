import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import type { IconService } from '@/server/icons/iconService';
import { ADMIN_SECURITY_SCHEME, errorResponse, jsonContent, OPENAPI_TAG } from '@/server/openapi';
import {
  CreateIconsRequestSchema,
  CreateIconsResponseSchema,
  IconDetailSchema,
  IconListSchema,
  IdParamSchema,
  ListIconsQuerySchema,
  MoveIconSetSchema,
  PreviewIconsRequestSchema,
  PreviewIconsResponseSchema,
  PublishDraftsRequestSchema,
  PublishDraftsResponseSchema,
  ReplaceIconSvgSchema,
  UpdateIconSchema,
} from '@/server/routes/admin/iconSchemas';
import { API_ROUTE, API_ROUTE_TEMPLATE } from '@/shared/constants/apiRoutes';

const security = [{ [ADMIN_SECURITY_SCHEME]: [] }];
const tags = [OPENAPI_TAG.icons];
const unauthorized = errorResponse('Admin session required');
const iconNotFound = errorResponse('Icon not found');
const invalidBody = errorResponse('Request body is invalid');
const iconResponse = (description: string) => ({ content: jsonContent(IconDetailSchema), description });

const listIconsRoute = createRoute({
  method: 'get',
  path: API_ROUTE.adminIcons,
  tags,
  security,
  summary: 'List icons with filters and pagination',
  request: { query: ListIconsQuerySchema },
  responses: { 200: { content: jsonContent(IconListSchema), description: 'A page of icons' }, 401: unauthorized },
});

const previewIconsRoute = createRoute({
  method: 'post',
  path: API_ROUTE.adminIconsPreview,
  tags,
  security,
  summary: 'Run the SVG pipeline on pasted code or files without saving',
  description:
    'Each source is split into icons (one per <symbol> or top-level <svg>), sanitized, classified as outline, solid or brand, ' +
    'placed in the earliest set of that style (or the set given in setOverrides) and normalized for it. ' +
    'Candidates report conflicts with icons already in their set.',
  request: { body: { content: jsonContent(PreviewIconsRequestSchema), required: true } },
  responses: {
    200: { content: jsonContent(PreviewIconsResponseSchema), description: 'Pipeline result per source' },
    401: unauthorized,
    404: errorResponse('Icon set not found'),
    422: invalidBody,
  },
});

const createIconsRoute = createRoute({
  method: 'post',
  path: API_ROUTE.adminIcons,
  tags,
  security,
  summary: 'Save several icons at once',
  description:
    'The server re-runs the pipeline on each source and never trusts SVG produced by the client. ' +
    'Each item succeeds or fails on its own; check `results`.',
  request: { body: { content: jsonContent(CreateIconsRequestSchema), required: true } },
  responses: {
    200: { content: jsonContent(CreateIconsResponseSchema), description: 'One result per requested item' },
    401: unauthorized,
    404: errorResponse('Icon set not found'),
    422: invalidBody,
  },
});

const publishDraftsRoute = createRoute({
  method: 'post',
  path: API_ROUTE.adminIconsPublishDrafts,
  tags,
  security,
  summary: 'Publish every draft, optionally only within one set or category',
  request: { body: { content: jsonContent(PublishDraftsRequestSchema), required: true } },
  responses: {
    200: { content: jsonContent(PublishDraftsResponseSchema), description: 'Number of icons published' },
    401: unauthorized,
    422: invalidBody,
  },
});

const getIconRoute = createRoute({
  method: 'get',
  path: API_ROUTE_TEMPLATE.adminIcon,
  tags,
  security,
  summary: 'Get one icon including its original source',
  request: { params: IdParamSchema },
  responses: { 200: iconResponse('The icon'), 401: unauthorized, 404: iconNotFound },
});

const updateIconRoute = createRoute({
  method: 'patch',
  path: API_ROUTE_TEMPLATE.adminIcon,
  tags,
  security,
  summary: 'Update icon metadata',
  description: 'The slug can only change while the icon has never been published.',
  request: { params: IdParamSchema, body: { content: jsonContent(UpdateIconSchema), required: true } },
  responses: {
    200: iconResponse('Updated icon'),
    401: unauthorized,
    404: iconNotFound,
    409: errorResponse('Slug already used, or slug change not allowed'),
    422: invalidBody,
  },
});

const replaceSvgRoute = createRoute({
  method: 'put',
  path: API_ROUTE_TEMPLATE.adminIconSvg,
  tags,
  security,
  summary: 'Replace the drawing of an icon',
  request: { params: IdParamSchema, body: { content: jsonContent(ReplaceIconSvgSchema), required: true } },
  responses: {
    200: iconResponse('Icon with the new drawing'),
    401: unauthorized,
    404: iconNotFound,
    409: errorResponse('The same drawing already exists in this set'),
    422: errorResponse('Source is invalid or contains no usable icon'),
  },
});

const moveSetRoute = createRoute({
  method: 'post',
  path: API_ROUTE_TEMPLATE.adminIconMoveSet,
  tags,
  security,
  summary: 'Move an icon to another set',
  description: 'The icon is normalized again from its original source with the rules of the target set (for example, Multi Color keeps original colors).',
  request: { params: IdParamSchema, body: { content: jsonContent(MoveIconSetSchema), required: true } },
  responses: {
    200: iconResponse('Icon in its new set'),
    401: unauthorized,
    404: errorResponse('Icon or set not found'),
    409: errorResponse('Slug or drawing already used in the target set'),
    422: errorResponse('Original source cannot be normalized for the target set'),
  },
});

function statusRoute(path: string, summary: string) {
  return createRoute({
    method: 'post',
    path,
    tags,
    security,
    summary,
    request: { params: IdParamSchema },
    responses: {
      200: iconResponse('Icon with its new status'),
      401: unauthorized,
      404: iconNotFound,
      409: errorResponse('Transition not allowed from the current status'),
    },
  });
}

const publishRoute = statusRoute(API_ROUTE_TEMPLATE.adminIconPublish, 'Publish a draft icon');
const archiveRoute = statusRoute(API_ROUTE_TEMPLATE.adminIconArchive, 'Archive a published icon (hide it, keep its slug)');
const restoreRoute = statusRoute(API_ROUTE_TEMPLATE.adminIconRestore, 'Restore an archived icon to published');

const deleteIconRoute = createRoute({
  method: 'delete',
  path: API_ROUTE_TEMPLATE.adminIcon,
  tags,
  security,
  summary: 'Delete a draft that was never published',
  request: { params: IdParamSchema },
  responses: {
    204: { description: 'Deleted' },
    401: unauthorized,
    404: iconNotFound,
    409: errorResponse('Icon was published; archive it instead'),
  },
});

export function registerAdminIconRoutes(app: OpenAPIHono<AppEnv>, service: IconService): void {
  app.openapi(listIconsRoute, async (c) => c.json(await service.listIcons(c.req.valid('query')), 200));

  app.openapi(previewIconsRoute, async (c) => c.json(await service.previewIcons(c.req.valid('json')), 200));

  app.openapi(createIconsRoute, async (c) =>
    c.json(await service.createIcons(c.req.valid('json'), c.get('adminEmail')), 200),
  );

  app.openapi(publishDraftsRoute, async (c) =>
    c.json(await service.publishDrafts(c.req.valid('json'), c.get('adminEmail')), 200),
  );

  app.openapi(getIconRoute, async (c) => c.json(await service.getIcon(c.req.valid('param').id), 200));

  app.openapi(updateIconRoute, async (c) => {
    const icon = await service.updateIcon(c.req.valid('param').id, c.req.valid('json'), c.get('adminEmail'));
    return c.json(icon, 200);
  });

  app.openapi(replaceSvgRoute, async (c) => {
    const icon = await service.replaceIconSvg(c.req.valid('param').id, c.req.valid('json'), c.get('adminEmail'));
    return c.json(icon, 200);
  });

  app.openapi(moveSetRoute, async (c) => {
    const icon = await service.moveIconToSet(c.req.valid('param').id, c.req.valid('json').setId, c.get('adminEmail'));
    return c.json(icon, 200);
  });

  app.openapi(publishRoute, async (c) =>
    c.json(await service.publishIcon(c.req.valid('param').id, c.get('adminEmail')), 200),
  );
  app.openapi(archiveRoute, async (c) =>
    c.json(await service.archiveIcon(c.req.valid('param').id, c.get('adminEmail')), 200),
  );
  app.openapi(restoreRoute, async (c) =>
    c.json(await service.restoreIcon(c.req.valid('param').id, c.get('adminEmail')), 200),
  );

  app.openapi(deleteIconRoute, async (c) => {
    await service.deleteIcon(c.req.valid('param').id, c.get('adminEmail'));
    return c.body(null, 204);
  });
}
