import { getConnInfo } from '@hono/node-server/conninfo';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '@/server/appEnv';
import { HTTP_STATUS, HttpError } from '@/server/lib/httpError';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

export const PUBLIC_RATE_LIMIT = {
  maxRequests: 600,
  windowMs: 60_000,
  pruneEveryHits: 1_000,
} as const;

// Trình duyệt giữ 60 giây; CDN (Vercel) giữ 5 phút và phục vụ bản cũ trong lúc làm mới ngầm thêm 10 phút.
const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
const UNKNOWN_CLIENT = 'unknown';

export interface PublicRateLimiter {
  allow(clientKey: string): boolean;
}

export function createPublicRateLimiter(now: () => number = Date.now): PublicRateLimiter {
  const hitsByClient = new Map<string, number[]>();
  let hitsSincePrune = 0;

  function prune(cutoff: number): void {
    for (const [client, hits] of hitsByClient) {
      const recent = hits.filter((hit) => hit > cutoff);
      if (recent.length === 0) hitsByClient.delete(client);
      else hitsByClient.set(client, recent);
    }
  }

  return {
    allow(clientKey) {
      const current = now();
      const cutoff = current - PUBLIC_RATE_LIMIT.windowMs;
      hitsSincePrune += 1;
      if (hitsSincePrune >= PUBLIC_RATE_LIMIT.pruneEveryHits) {
        prune(cutoff);
        hitsSincePrune = 0;
      }

      const recent = (hitsByClient.get(clientKey) ?? []).filter((hit) => hit > cutoff);
      if (recent.length >= PUBLIC_RATE_LIMIT.maxRequests) {
        hitsByClient.set(clientKey, recent);
        return false;
      }
      recent.push(current);
      hitsByClient.set(clientKey, recent);
      return true;
    },
  };
}

// Dùng địa chỉ socket; khi deploy sau proxy cần đổi sang header của proxy, vì mọi request sẽ có chung IP proxy.
function readClientKey(c: Parameters<typeof getConnInfo>[0]): string {
  try {
    return getConnInfo(c).remote.address ?? UNKNOWN_CLIENT;
  } catch {
    return UNKNOWN_CLIENT;
  }
}

export function publicApiGuard(limiter: PublicRateLimiter) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!limiter.allow(readClientKey(c))) {
      throw new HttpError(HTTP_STATUS.tooManyRequests, ERROR_CODE.tooManyRequests, 'Too many requests, slow down');
    }
    await next();
    if (c.req.method === 'GET' && c.res.status === 200) c.header('Cache-Control', PUBLIC_CACHE_CONTROL);
  });
}
