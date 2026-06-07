import { NextFunction, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

type Controller = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export const asyncHandler = (controller: Controller): Controller => (
  req,
  res,
  next
) => {
  return Promise.resolve(controller(req, res, next)).catch(next);
};

export const requireUserId = (req: AuthRequest): number => {
  if (!req.userId) {
    throw new AppError('Authentication required', 401);
  }
  return req.userId;
};

export const parseIdParam = (
  req: AuthRequest,
  paramName = 'id',
  label = 'ID'
): number => {
  const value = Number(req.params[paramName]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(`Invalid ${label}`, 400);
  }
  return value;
};

export const requireFields = (
  body: Record<string, unknown>,
  fields: string[],
  message: string
): void => {
  const missing = fields.some((field) => !body[field]);
  if (missing) {
    throw new AppError(message, 400);
  }
};

export const publicUser = (user: { id: number; email: string }) => ({
  id: user.id,
  email: user.email,
});
