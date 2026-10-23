export const LOGIN_RATE_LIMIT = {
  maxFailures: 10,
  windowMs: 15 * 60 * 1000,
} as const;

export interface LoginRateLimiter {
  isBlocked(): boolean;
  recordFailure(): void;
  reset(): void;
}

// Giới hạn chung, không theo IP: chỉ có một tài khoản admin, nên chặn dò mật khẩu
// quan trọng hơn rủi ro admin bị khoá đăng nhập tạm thời.
export function createLoginRateLimiter(now: () => number = Date.now): LoginRateLimiter {
  let failureTimestamps: number[] = [];

  function pruneExpired(): void {
    const cutoff = now() - LOGIN_RATE_LIMIT.windowMs;
    failureTimestamps = failureTimestamps.filter((timestamp) => timestamp > cutoff);
  }

  return {
    isBlocked() {
      pruneExpired();
      return failureTimestamps.length >= LOGIN_RATE_LIMIT.maxFailures;
    },
    recordFailure() {
      failureTimestamps.push(now());
    },
    reset() {
      failureTimestamps = [];
    },
  };
}
