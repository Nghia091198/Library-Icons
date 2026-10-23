import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig } from '@/server/config';

export function createSupabaseAdminClient(
  config: Pick<AppConfig, 'supabaseUrl' | 'supabaseServiceRoleKey'>,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    // Server không có storage cho session; mỗi request tự mang access token.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
