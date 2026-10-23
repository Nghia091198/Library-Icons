import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv } from '@/server/appEnv';
import type { AdminCredentials } from '@/server/auth/adminCredentials';
import type { LoginRateLimiter } from '@/server/auth/loginRateLimiter';
import type { IconRepository } from '@/server/icons/iconRepository';
import { createIconService } from '@/server/icons/iconService';
import { HTTP_STATUS, HttpError, toErrorBody } from '@/server/lib/httpError';
import type { Logger } from '@/server/lib/logger';
import { requireAdmin } from '@/server/middleware/requireAdmin';
import { createPublicRateLimiter, publicApiGuard, type PublicRateLimiter } from '@/server/middleware/publicApiGuard';
import { registerOpenApiSecurity } from '@/server/openapi';
import { registerAdminIcons } from '@/server/routes/admin';
import { registerAdminMeRoute } from '@/server/routes/adminMe';
import { registerAuthRoutes } from '@/server/routes/auth';
import { registerHealthRoute } from '@/server/routes/health';
import { registerPublicIconRoutes } from '@/server/routes/public/publicIcons';
import { API_PREFIX, API_ROUTE } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

const API_TITLE = 'Lib Icons API';
const API_VERSION = '0.1.0';
const ADMIN_MAX_BODY_BYTES = 5_000_000;

export interface AppDeps {
  admin: AdminCredentials;
  sessionSecret: string;
  cookieSecure: boolean;
  loginRateLimiter: LoginRateLimiter;
  iconRepository: IconRepository;
  publicRateLimiter?: PublicRateLimiter;
  logger: Logger;
  now?: () => Date;
}

export function createApp(deps: AppDeps): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          toErrorBody(ERROR_CODE.validationFailed, 'Request validation failed', result.error.flatten()),
          HTTP_STATUS.unprocessable,
        );
      }
    },
  });

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json(toErrorBody(error.code, error.message, error.details), error.status);
    }
    deps.logger.error({ err: error }, 'Unhandled error');
    return c.json(toErrorBody(ERROR_CODE.internal, 'Internal server error'), HTTP_STATUS.internal);
  });

  app.notFound((c) => c.json(toErrorBody(ERROR_CODE.notFound, 'Route not found'), HTTP_STATUS.notFound));

  registerOpenApiSecurity(app);
  app.use(`${API_PREFIX.public}/*`, publicApiGuard(deps.publicRateLimiter ?? createPublicRateLimiter()));
  app.use(
    `${API_PREFIX.admin}/*`,
    bodyLimit({
      maxSize: ADMIN_MAX_BODY_BYTES,
      onError: (c) =>
        c.json(toErrorBody(ERROR_CODE.payloadTooLarge, 'Request body is too large'), HTTP_STATUS.payloadTooLarge),
    }),
  );
  app.use(`${API_PREFIX.admin}/*`, requireAdmin({ adminEmail: deps.admin.email, sessionSecret: deps.sessionSecret }));

  const iconService = createIconService({ repository: deps.iconRepository, now: deps.now });
  registerHealthRoute(app);
  registerPublicIconRoutes(app, iconService);
  registerAuthRoutes(app, deps);
  registerAdminMeRoute(app);
  registerAdminIcons(app, iconService);

  app.doc31(API_ROUTE.openApiSpec, {
    openapi: '3.1.0',
    info: { title: API_TITLE, version: API_VERSION },
  });
  app.get(API_ROUTE.docs, swaggerUI({ url: API_ROUTE.openApiSpec }));

  return app;
}
