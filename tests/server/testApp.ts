import { createApp } from '@/server/app';
import { createLoginRateLimiter, type LoginRateLimiter } from '@/server/auth/loginRateLimiter';
import { createLogger } from '@/server/lib/logger';
import type { PublicRateLimiter } from '@/server/middleware/publicApiGuard';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import { createInMemoryIconRepository, type InMemoryIconRepository } from './icons/inMemoryIconRepository';

export const TEST_ADMIN = {
  email: 'admin@example.com',
  password: 'correct-horse-battery',
} as const;

export const TEST_SESSION_SECRET = 'test-session-secret-at-least-32-characters';

export interface TestAppOptions {
  loginRateLimiter?: LoginRateLimiter;
  publicRateLimiter?: PublicRateLimiter;
  iconRepository?: InMemoryIconRepository;
}

export function createTestApp(options: TestAppOptions = {}) {
  return createApp({
    admin: TEST_ADMIN,
    sessionSecret: TEST_SESSION_SECRET,
    cookieSecure: false,
    loginRateLimiter: options.loginRateLimiter ?? createLoginRateLimiter(),
    publicRateLimiter: options.publicRateLimiter,
    iconRepository: options.iconRepository ?? createInMemoryIconRepository(),
    logger: createLogger('silent'),
  });
}

export function jsonPost(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export function readSessionCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) throw new Error('Response did not set a cookie');
  const [nameValue] = setCookie.split(';');
  if (!nameValue) throw new Error('Malformed Set-Cookie header');
  return nameValue;
}

export async function createSignedInClient(options: TestAppOptions = {}) {
  const iconRepository = options.iconRepository ?? createInMemoryIconRepository();
  const app = createTestApp({ ...options, iconRepository });
  const login = await app.request(API_ROUTE.authLogin, jsonPost(TEST_ADMIN));
  const cookie = readSessionCookie(login);

  function send(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = { Cookie: cookie };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  return { app, iconRepository, send };
}
