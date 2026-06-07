import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const get = vi.fn();
let requestInterceptor: ((config: any) => any) | undefined;
let responseRejectInterceptor: ((error: any) => any) | undefined;
const create = vi.fn(() => ({
  get,
  post,
  interceptors: {
    request: { use: vi.fn((handler) => { requestInterceptor = handler; }) },
    response: { use: vi.fn((_success, reject) => { responseRejectInterceptor = reject; }) },
  },
}));

vi.mock('axios', () => ({
  default: {
    create,
  },
}));

vi.mock('../utils/requestEncryption', () => ({
  encryptWithPublicKey: vi.fn(async () => 'encrypted-secret'),
}));

describe('auth API encryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    requestInterceptor = undefined;
    responseRejectInterceptor = undefined;
    localStorage.clear();
    window.history.pushState({}, '', '/');
    get.mockResolvedValue({ data: { publicKey: 'public-key' } });
    post.mockResolvedValue({ data: {} });
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
  });

  it('falls back to /api when a production build is given a localhost API URL', async () => {
    const { resolveApiBaseUrl } = await import('./api');

    expect(resolveApiBaseUrl('http://localhost:3000/api', true)).toBe('/api');
    expect(resolveApiBaseUrl('http://127.0.0.1:3000/api', true)).toBe('/api');
    expect(resolveApiBaseUrl('http://[::1]:3000/api', true)).toBe('/api');
  });

  it('falls back to /api when a production build is given an insecure HTTP API URL', async () => {
    const { resolveApiBaseUrl } = await import('./api');

    expect(resolveApiBaseUrl('http://8.136.39.247/api', true)).toBe('/api');
  });

  it('keeps explicit non-localhost API URLs', async () => {
    const { resolveApiBaseUrl } = await import('./api');

    expect(resolveApiBaseUrl('https://api.example.com/api', true)).toBe('https://api.example.com/api');
  });

  it('sends encrypted login passwords without plaintext password fields', async () => {
    const { authAPI } = await import('./api');

    await authAPI.login({ email: 'a@example.com', password: 'secret1' });

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@example.com',
      encryptedPassword: 'encrypted-secret',
    });
    expect(JSON.stringify(post.mock.calls[0][1])).not.toContain('secret1');
    expect(post.mock.calls[0][1]).not.toHaveProperty('password');
  });

  it('sends encrypted registration passwords without plaintext password fields', async () => {
    const { authAPI } = await import('./api');

    await authAPI.register({
      email: 'a@example.com',
      password: 'secret1',
      verificationCode: '123456',
    });

    expect(post).toHaveBeenCalledWith('/auth/register', {
      email: 'a@example.com',
      verificationCode: '123456',
      encryptedPassword: 'encrypted-secret',
    });
    expect(JSON.stringify(post.mock.calls[0][1])).not.toContain('secret1');
    expect(post.mock.calls[0][1]).not.toHaveProperty('password');
  });

  it('sends encrypted reset passwords without plaintext password fields', async () => {
    const { authAPI } = await import('./api');

    await authAPI.resetPassword({
      email: 'a@example.com',
      password: 'secret2',
      verificationCode: '123456',
    });

    expect(post).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'a@example.com',
      verificationCode: '123456',
      encryptedPassword: 'encrypted-secret',
    });
    expect(JSON.stringify(post.mock.calls[0][1])).not.toContain('secret2');
    expect(post.mock.calls[0][1]).not.toHaveProperty('password');
  });

  it('does not send localStorage bearer tokens', async () => {
    localStorage.setItem('token', 'stale-token');
    await import('./api');

    const config = requestInterceptor?.({ method: 'get', headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('adds the CSRF header for unsafe cookie-auth requests', async () => {
    document.cookie = 'csrf_token=csrf-a; path=/';
    await import('./api');

    const config = requestInterceptor?.({ method: 'post', headers: {} });

    expect(config.headers['X-CSRF-Token']).toBe('csrf-a');
  });

  it('does not remove localStorage tokens on 401 because auth is cookie-only', async () => {
    localStorage.setItem('token', 'legacy-token');
    window.history.pushState({}, '', '/login');
    await import('./api');

    await expect(responseRejectInterceptor?.({
      response: { status: 401 },
      config: { url: '/notes' },
    })).rejects.toBeTruthy();

    expect(localStorage.getItem('token')).toBe('legacy-token');
  });

  it('does not redirect public pages when the auth probe returns 401', async () => {
    window.history.pushState({}, '', '/register');
    await import('./api');

    await expect(responseRejectInterceptor?.({
      response: { status: 401 },
      config: { url: '/auth/me' },
    })).rejects.toBeTruthy();

    expect(window.location.pathname).toBe('/register');
  });
});
