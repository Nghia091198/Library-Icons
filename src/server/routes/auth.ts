import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import { deleteCookie, setCookie } from 'hono/cookie';
import type { CookieOptions } from 'hono/utils/cookie';
import type { AppEnv } from '@/server/appEnv';
import { areValidAdminCredentials, type AdminCredentials } from '@/server/auth/adminCredentials';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
} from '@/server/auth/adminSession';
import type { LoginRateLimiter } from '@/server/auth/loginRateLimiter';
import { ErrorBodySchema, HTTP_STATUS, HttpError } from '@/server/lib/httpError';
import { jsonContent, OPENAPI_TAG } from '@/server/openapi';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import type { AdminMeResponse, LoginRequest } from '@/shared/types/api';

export interface AuthRouteDeps {
  admin: AdminCredentials;
  sessionSecret: string;
  cookieSecure: boolean;
  loginRateLimiter: LoginRateLimiter;
}

const LoginRequestSchema = z
  .object({ email: z.string().email(), password: z.string().min(1) })
  .openapi('LoginRequest') satisfies z.ZodType<LoginRequest>;

const AdminSessionSchema = z
  .object({ email: z.string().email() })
  .openapi('AdminSession') satisfies z.ZodType<AdminMeResponse>;

const loginRoute = createRoute({
  method: 'post',
  path: API_ROUTE.authLogin,
  tags: [OPENAPI_TAG.auth],
  summary: 'Sign in as admin and receive a session cookie',
  request: { body: { content: jsonContent(LoginRequestSchema), required: true } },
  responses: {
    200: { content: jsonContent(AdminSessionSchema), description: 'Signed in; session cookie set' },
    401: { content: jsonContent(ErrorBodySchema), description: 'Email or password is incorrect' },
    422: { content: jsonContent(ErrorBodySchema), description: 'Request body is invalid' },
    429: { content: jsonContent(ErrorBodySchema), description: 'Too many failed attempts' },
  },
});

const logoutRoute = createRoute({
  method: 'post',
  path: API_ROUTE.authLogout,
  tags: [OPENAPI_TAG.auth],
  summary: 'Sign out and clear the session cookie',
  responses: {
    204: { description: 'Signed out' },
  },
});

function sessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: ADMIN_SESSION_TTL_SECONDS };
}

export function registerAuthRoutes(app: OpenAPIHono<AppEnv>, deps: AuthRouteDeps): void {
  app.openapi(loginRoute, async (c) => {
    if (deps.loginRateLimiter.isBlocked()) {
      throw new HttpError(
        HTTP_STATUS.tooManyRequests,
        ERROR_CODE.tooManyRequests,
        'Too many failed sign-in attempts, try again later',
      );
    }

    const credentials = c.req.valid('json');
    if (!areValidAdminCredentials(credentials, deps.admin)) {
      deps.loginRateLimiter.recordFailure();
      throw new HttpError(HTTP_STATUS.unauthorized, ERROR_CODE.invalidCredentials, 'Email or password is incorrect');
    }

    deps.loginRateLimiter.reset();
    const token = await createAdminSessionToken(deps.admin.email, deps.sessionSecret);
    setCookie(c, ADMIN_SESSION_COOKIE, token, sessionCookieOptions(deps.cookieSecure));
    return c.json({ email: deps.admin.email }, 200);
  });

  app.openapi(logoutRoute, (c) => {
    deleteCookie(c, ADMIN_SESSION_COOKIE, { path: '/', secure: deps.cookieSecure });
    return c.body(null, 204);
  });
}
