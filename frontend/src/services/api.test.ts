import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const get = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get,
      post,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
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
});
