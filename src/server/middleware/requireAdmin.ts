import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '@/server/appEnv';
import { ADMIN_SESSION_COOKIE, readAdminSessionEmail } from '@/server/auth/adminSession';
import { HTTP_STATUS, HttpError } from '@/server/lib/httpError';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

export interface RequireAdminDeps {
  adminEmail: string;
  sessionSecret: string;
}

export function requireAdmin({ adminEmail, sessionSecret }: RequireAdminDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, ADMIN_SESSION_COOKIE);
    const sessionEmail = token ? await readAdminSessionEmail(token, sessionSecret) : null;

    if (sessionEmail === null || sessionEmail !== adminEmail) {
      throw new HttpError(
        HTTP_STATUS.unauthorized,
        ERROR_CODE.unauthorized,
        'Admin session is missing, invalid or expired',
      );
    }

    c.set('adminEmail', sessionEmail);
    await next();
  });
}
