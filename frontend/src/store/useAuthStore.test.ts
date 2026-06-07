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
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('sets and clears authentication state', () => {
    const user = { id: 1, email: 'a@example.com' };

    useAuthStore.getState().setAuth(user);

    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      user,
      isAuthenticated: true,
    });

    useAuthStore.getState().clearAuth();

    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('loads the current user from the httpOnly auth cookie', async () => {
    vi.mocked(authAPI.me).mockResolvedValue({ data: { user: { id: 2, email: 'b@example.com' } } } as any);

    await useAuthStore.getState().checkAuth();

    expect(authAPI.me).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 2, email: 'b@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('clears auth when cookie validation fails', async () => {
    vi.mocked(authAPI.me).mockRejectedValue(new Error('expired'));

    await useAuthStore.getState().checkAuth();

    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });
});
