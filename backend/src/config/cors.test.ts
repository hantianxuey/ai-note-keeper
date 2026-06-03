import { describe, expect, it } from 'vitest';
import { getAllowedOrigins, isOriginAllowed } from './cors';

describe('isOriginAllowed', () => {
  it('allows requests without an origin for non-browser clients', () => {
    expect(isOriginAllowed(undefined, ['http://localhost:3001'])).toBe(true);
  });

  it('allows configured frontend origins', () => {
    expect(isOriginAllowed('http://localhost:3001', ['http://localhost:3001'])).toBe(true);
  });

  it('rejects unknown browser origins', () => {
    expect(isOriginAllowed('https://evil.example', ['http://localhost:3001'])).toBe(false);
  });
});

describe('getAllowedOrigins', () => {
  it('includes localhost and 127.0.0.1 development frontend origins', () => {
    expect(getAllowedOrigins({})).toContain('http://127.0.0.1:4002');
  });
});
