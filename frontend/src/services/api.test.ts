import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const get = vi.fn();
const create = vi.fn(() => ({
  get,
  post,
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
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
    get.mockResolvedValue({ data: { publicKey: 'public-key' } });
    post.mockResolvedValue({ data: {} });
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
});
