require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const authCookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('auth_token='))
    ?.slice('auth_token='.length);

  if ((!authHeader || !authHeader.startsWith('Bearer ')) && !authCookie) {
    return next(new AppError('Unauthorized: No token provided', 401));
  }

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : decodeURIComponent(authCookie || '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return next(new AppError('Unauthorized: Invalid token', 401));
  }
};
