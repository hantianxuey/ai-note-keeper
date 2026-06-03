import { describe, expect, it, vi } from 'vitest';
import {
  asyncHandler,
  parseIdParam,
  publicUser,
  requireFields,
  requireUserId,
} from './controllerUtils';

describe('controller utilities', () => {
  it('forwards async controller errors to next', async () => {
    const error = new Error('boom');
    const next = vi.fn();
    const controller = asyncHandler(async () => {
      throw error;
    });

    controller({} as any, {} as any, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(error));
  });

  it('requires an authenticated user id', () => {
    expect(requireUserId({ userId: 7 } as any)).toBe(7);
    expect(() => requireUserId({} as any)).toThrow('Authentication required');
  });

  it('parses positive integer route params', () => {
    expect(parseIdParam({ params: { id: '12' } } as any, 'id', 'note ID')).toBe(12);
    expect(() => parseIdParam({ params: { id: 'abc' } } as any, 'id', 'note ID')).toThrow('Invalid note ID');
    expect(() => parseIdParam({ params: { id: '0' } } as any, 'id', 'note ID')).toThrow('Invalid note ID');
  });

  it('requires body fields', () => {
    expect(() => requireFields({ title: 'A', content: 'B' }, ['title', 'content'], 'Required')).not.toThrow();
    expect(() => requireFields({ title: 'A' }, ['title', 'content'], 'Required')).toThrow('Required');
  });

  it('returns a public user shape', () => {
    expect(publicUser({ id: 1, email: 'a@example.com', password_hash: 'secret' } as any)).toEqual({
      id: 1,
      email: 'a@example.com',
    });
  });
});
