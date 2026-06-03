import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, errorHandler } from './errorHandler';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('AppError', () => {
  it('stores the message, status code, and class name', () => {
    const error = new AppError('Missing note', 404);

    expect(error.message).toBe('Missing note');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('AppError');
  });
});

describe('errorHandler', () => {
  it('serializes application errors', () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const response = { status, json };
    const error = new AppError('Forbidden', 403);

    errorHandler(error, {} as any, response as any, vi.fn());

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: {
        message: 'Forbidden',
      },
    });
  });
});
