import type { OpenAPIHono } from '@hono/zod-openapi';
import { createApp } from '@/server/app';
import type { AppEnv } from '@/server/appEnv';
import { createLoginRateLimiter } from '@/server/auth/loginRateLimiter';
import { loadConfig, type AppConfig } from '@/server/config';
import { createSupabaseAdminClient } from '@/server/db/supabase';
import { createSupabaseIconRepository } from '@/server/db/supabaseIconRepository';
import { createLogger, type Logger } from '@/server/lib/logger';

export interface ProductionApp {
  app: OpenAPIHono<AppEnv>;
  config: AppConfig;
  logger: Logger;
}

// Dựng app từ biến môi trường; dùng chung cho server Node (npm start) và hàm serverless trên Vercel.
export function createProductionApp(env: Record<string, string | undefined>): ProductionApp {
  const config = loadConfig(env);
  const logger = createLogger(config.logLevel);
  const supabase = createSupabaseAdminClient(config);

  const app = createApp({
    admin: { email: config.adminEmail, password: config.adminPassword },
    sessionSecret: config.adminSessionSecret,
    cookieSecure: config.cookieSecure,
    loginRateLimiter: createLoginRateLimiter(),
    iconRepository: createSupabaseIconRepository(supabase),
    logger,
  });
  return { app, config, logger };
}
