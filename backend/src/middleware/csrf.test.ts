import { describe, expect, it, vi } from 'vitest';
import { csrfProtection } from './csrf';

describe('csrfProtection', () => {
  it('allows safe requests without a CSRF token', () => {
    const next = vi.fn();

    csrfProtection({ method: 'GET', headers: {} } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows public auth endpoints before a user has an auth cookie', () => {
    const next = vi.fn();

    csrfProtection({
      method: 'POST',
      path: '/auth/login',
      originalUrl: '/api/auth/login',
      headers: {},
    } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects unsafe cookie-auth requests without a matching CSRF header', () => {
    const next = vi.fn();

    csrfProtection({
      method: 'POST',
      path: '/notes',
      originalUrl: '/api/notes',
      headers: { cookie: 'auth_token=token; csrf_token=csrf-a', 'x-csrf-token': 'csrf-b' },
    } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('allows unsafe cookie-auth requests with a matching CSRF header', () => {
    const next = vi.fn();

    csrfProtection({
      method: 'POST',
      path: '/notes',
      originalUrl: '/api/notes',
      headers: { cookie: 'auth_token=token; csrf_token=csrf-a', 'x-csrf-token': 'csrf-a' },
    } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });
});
