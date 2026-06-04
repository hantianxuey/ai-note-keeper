import { describe, expect, it } from 'vitest';
import { getAuthRateLimitConfig, getRequestBodyLimit } from './security';

describe('security config', () => {
  it('uses a conservative request body limit by default', () => {
    expect(getRequestBodyLimit({})).toBe('1mb');
  });

  it('allows auth rate limit thresholds to be configured', () => {
    expect(getAuthRateLimitConfig({
      AUTH_RATE_LIMIT_WINDOW_MS: '60000',
      AUTH_RATE_LIMIT_MAX: '3',
    })).toEqual({
      windowMs: 60000,
      limit: 3,
    });
  });
});
