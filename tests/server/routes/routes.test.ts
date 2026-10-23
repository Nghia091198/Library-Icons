import { describe, expect, it } from 'vitest';
import { createAdminSessionToken } from '@/server/auth/adminSession';
import { createLoginRateLimiter, LOGIN_RATE_LIMIT } from '@/server/auth/loginRateLimiter';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { createTestApp, jsonPost, readSessionCookie, TEST_ADMIN, TEST_SESSION_SECRET } from '../testApp';

async function signIn(app = createTestApp()) {
  const response = await app.request(API_ROUTE.authLogin, jsonPost(TEST_ADMIN));
  return { app, cookie: readSessionCookie(response) };
}

describe(`GET ${API_ROUTE.health}`, () => {
  it('returns ok without authentication', async () => {
    const response = await createTestApp().request(API_ROUTE.health);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});

describe(`POST ${API_ROUTE.authLogin}`, () => {
  it('sets an httpOnly session cookie for valid credentials', async () => {
    const response = await createTestApp().request(API_ROUTE.authLogin, jsonPost(TEST_ADMIN));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: TEST_ADMIN.email });
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(response.headers.get('set-cookie')).toMatch(/SameSite=Lax/);
  });

  it('accepts the email case-insensitively', async () => {
    const response = await createTestApp().request(
      API_ROUTE.authLogin,
      jsonPost({ ...TEST_ADMIN, email: TEST_ADMIN.email.toUpperCase() }),
    );

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password without setting a cookie', async () => {
    const response = await createTestApp().request(
      API_ROUTE.authLogin,
      jsonPost({ ...TEST_ADMIN, password: 'wrong-password' }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: ERROR_CODE.invalidCredentials } });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('rejects an invalid body', async () => {
    const response = await createTestApp().request(API_ROUTE.authLogin, jsonPost({ email: 'not-an-email' }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: ERROR_CODE.validationFailed } });
  });

  it('blocks sign-in after too many failures, even with the right password, until the window passes', async () => {
    let now = 0;
    const app = createTestApp({ loginRateLimiter: createLoginRateLimiter(() => now) });
    const wrongCredentials = jsonPost({ ...TEST_ADMIN, password: 'wrong-password' });

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT.maxFailures; attempt += 1) {
      await app.request(API_ROUTE.authLogin, wrongCredentials);
    }
    const blocked = await app.request(API_ROUTE.authLogin, jsonPost(TEST_ADMIN));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ error: { code: ERROR_CODE.tooManyRequests } });

    now += LOGIN_RATE_LIMIT.windowMs + 1;
    const allowed = await app.request(API_ROUTE.authLogin, jsonPost(TEST_ADMIN));
    expect(allowed.status).toBe(200);
  });
});

describe(`GET ${API_ROUTE.adminMe}`, () => {
  it('rejects a request without a session cookie', async () => {
    const response = await createTestApp().request(API_ROUTE.adminMe);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: ERROR_CODE.unauthorized } });
  });

  it('returns the admin email for a valid session', async () => {
    const { app, cookie } = await signIn();
    const response = await app.request(API_ROUTE.adminMe, { headers: { Cookie: cookie } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: TEST_ADMIN.email });
  });

  it('rejects a tampered session cookie', async () => {
    const { app, cookie } = await signIn();
    const response = await app.request(API_ROUTE.adminMe, { headers: { Cookie: `${cookie}tampered` } });

    expect(response.status).toBe(401);
  });

  it('rejects a session signed with a different secret', async () => {
    const forgedToken = await createAdminSessionToken(TEST_ADMIN.email, 'another-secret-that-is-also-32-chars!!');
    const response = await createTestApp().request(API_ROUTE.adminMe, {
      headers: { Cookie: `lib_icons_admin_session=${forgedToken}` },
    });

    expect(response.status).toBe(401);
  });

  it('rejects an expired session', async () => {
    const longAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30;
    const expiredToken = await createAdminSessionToken(TEST_ADMIN.email, TEST_SESSION_SECRET, longAgo);
    const response = await createTestApp().request(API_ROUTE.adminMe, {
      headers: { Cookie: `lib_icons_admin_session=${expiredToken}` },
    });

    expect(response.status).toBe(401);
  });
});

describe(`POST ${API_ROUTE.authLogout}`, () => {
  it('clears the session cookie', async () => {
    const { app, cookie } = await signIn();
    const response = await app.request(API_ROUTE.authLogout, { method: 'POST', headers: { Cookie: cookie } });

    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });
});

describe('unknown routes', () => {
  it('returns the standard error body', async () => {
    const response = await createTestApp().request('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: ERROR_CODE.notFound } });
  });
});

describe(`GET ${API_ROUTE.openApiSpec}`, () => {
  it('documents the registered routes and the admin session scheme', async () => {
    const response = await createTestApp().request(API_ROUTE.openApiSpec);
    const spec: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(spec).toMatchObject({
      paths: { [API_ROUTE.health]: {}, [API_ROUTE.authLogin]: {}, [API_ROUTE.adminMe]: {} },
      components: { securitySchemes: { adminSession: { type: 'apiKey', in: 'cookie' } } },
    });
  });
});
