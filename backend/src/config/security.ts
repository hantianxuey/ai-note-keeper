type SecurityEnv = Partial<Record<
  'REQUEST_BODY_LIMIT' | 'AUTH_RATE_LIMIT_WINDOW_MS' | 'AUTH_RATE_LIMIT_MAX',
  string
>>;

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRequestBodyLimit(env: SecurityEnv = process.env): string {
  return env.REQUEST_BODY_LIMIT || '1mb';
}

export function getAuthRateLimitConfig(env: SecurityEnv = process.env): { windowMs: number; limit: number } {
  return {
    windowMs: positiveNumber(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    limit: positiveNumber(env.AUTH_RATE_LIMIT_MAX, 10),
  };
}
