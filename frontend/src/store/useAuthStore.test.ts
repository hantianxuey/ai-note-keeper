import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authAPI } from '../services/api';
import { useAuthStore } from './useAuthStore';

vi.mock('../services/api', () => ({
  authAPI: {
    me: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('sets and clears authentication state', () => {
    const user = { id: 1, email: 'a@example.com' };

    useAuthStore.getState().setAuth(user, 'token');

    expect(localStorage.getItem('token')).toBe('token');
    expect(useAuthStore.getState()).toMatchObject({
      user,
      token: 'token',
      isAuthenticated: true,
    });

    useAuthStore.getState().clearAuth();

    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('loads the current user when a token exists', async () => {
    localStorage.setItem('token', 'token');
    vi.mocked(authAPI.me).mockResolvedValue({ data: { user: { id: 2, email: 'b@example.com' } } } as any);

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 2, email: 'b@example.com' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('clears auth when token validation fails', async () => {
    localStorage.setItem('token', 'token');
    vi.mocked(authAPI.me).mockRejectedValue(new Error('expired'));

    await useAuthStore.getState().checkAuth();

    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });
});
