import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { recordAuditEvent } from '../services/auditService';
import { getCookieValue } from '../utils/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_UNSAFE_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/verification-code',
  '/api/auth/password-reset-code',
]);

export const csrfProtection = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (SAFE_METHODS.has(req.method.toUpperCase()) || PUBLIC_UNSAFE_PATHS.has(req.originalUrl.split('?')[0])) {
    return next();
  }

  const authToken = getCookieValue(req.headers.cookie, 'auth_token');
  if (!authToken) {
    return next();
  }

  const csrfCookie = getCookieValue(req.headers.cookie, 'csrf_token');
  const csrfHeader = req.headers['x-csrf-token'];
  const csrfHeaderValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

  if (!csrfCookie || !csrfHeaderValue || csrfCookie !== csrfHeaderValue) {
    recordAuditEvent({
      event: 'auth.csrf',
      outcome: 'failure',
      metadata: { method: req.method, path: req.originalUrl },
    });
    return next(new AppError('Forbidden: Invalid CSRF token', 403));
  }

  return next();
};
