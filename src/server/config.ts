import { z } from 'zod';
import { LOG_LEVELS, type LogLevel } from '@/server/lib/logger';

const DEFAULT_PORT = 8787;
const MIN_ADMIN_PASSWORD_LENGTH = 8;
const MIN_SESSION_SECRET_LENGTH = 32;

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(MIN_ADMIN_PASSWORD_LENGTH),
  ADMIN_SESSION_SECRET: z.string().min(MIN_SESSION_SECRET_LENGTH),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
});

export interface AppConfig {
  port: number;
  logLevel: LogLevel;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  adminEmail: string;
  adminPassword: string;
  adminSessionSecret: string;
  cookieSecure: boolean;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }

  const parsed = result.data;
  return {
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    adminEmail: parsed.ADMIN_EMAIL.trim().toLowerCase(),
    adminPassword: parsed.ADMIN_PASSWORD,
    adminSessionSecret: parsed.ADMIN_SESSION_SECRET,
    cookieSecure: parsed.COOKIE_SECURE === 'true',
  };
}
