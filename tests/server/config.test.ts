import { describe, expect, it } from 'vitest';
import { loadConfig } from '@/server/config';

const REQUIRED_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  ADMIN_EMAIL: 'Admin@Example.com',
  ADMIN_PASSWORD: 'long-enough-password',
  ADMIN_SESSION_SECRET: 'a-session-secret-with-at-least-32-chars',
};

describe('loadConfig', () => {
  it('applies defaults for optional variables', () => {
    const config = loadConfig(REQUIRED_ENV);

    expect(config.port).toBe(8787);
    expect(config.logLevel).toBe('info');
    expect(config.cookieSecure).toBe(false);
  });

  it('normalizes the admin email', () => {
    expect(loadConfig(REQUIRED_ENV).adminEmail).toBe('admin@example.com');
  });

  it('parses PORT and COOKIE_SECURE', () => {
    const config = loadConfig({ ...REQUIRED_ENV, PORT: '3000', COOKIE_SECURE: 'true' });

    expect(config.port).toBe(3000);
    expect(config.cookieSecure).toBe(true);
  });

  it('throws when a required variable is missing', () => {
    expect(() => loadConfig({ ...REQUIRED_ENV, ADMIN_PASSWORD: undefined })).toThrow(/ADMIN_PASSWORD/);
  });

  it('rejects a session secret that is too short', () => {
    expect(() => loadConfig({ ...REQUIRED_ENV, ADMIN_SESSION_SECRET: 'short' })).toThrow(/ADMIN_SESSION_SECRET/);
  });
});
