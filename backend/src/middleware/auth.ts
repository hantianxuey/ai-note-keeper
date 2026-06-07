require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { recordAuditEvent } from '../services/auditService';
import { AuthSessionModel } from '../models/AuthSession';
import { getCookieValue } from '../utils/cookies';

export interface AuthRequest extends Request {
  userId?: number;
  sessionId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authCookie = getCookieValue(req.headers.cookie, 'auth_token');

  if (!authCookie) {
    recordAuditEvent({ event: 'auth.authenticate', outcome: 'failure', metadata: { reason: 'missing_token' } });
    return next(new AppError('Unauthorized: No token provided', 401));
  }

  try {
    const decoded = jwt.verify(authCookie, JWT_SECRET!) as {
      userId?: number;
      sessionId?: string;
      tokenVersion?: number;
    };

    if (!decoded.userId || !decoded.sessionId || !decoded.tokenVersion) {
      recordAuditEvent({ event: 'auth.authenticate', outcome: 'failure', metadata: { reason: 'invalid_claims' } });
      return next(new AppError('Unauthorized: Invalid token', 401));
    }

    const session = await AuthSessionModel.findActive(decoded.sessionId, decoded.userId);
    if (!session || session.token_version !== decoded.tokenVersion) {
      recordAuditEvent({
        event: 'auth.authenticate',
        outcome: 'failure',
        userId: decoded.userId,
        metadata: { reason: 'invalid_session' },
      });
      return next(new AppError('Unauthorized: Invalid session', 401));
    }

    req.userId = decoded.userId;
    req.sessionId = decoded.sessionId;
    void AuthSessionModel.touch(decoded.sessionId, decoded.userId);
    return next();
  } catch (error) {
    recordAuditEvent({ event: 'auth.authenticate', outcome: 'failure', metadata: { reason: 'invalid_token' } });
    return next(new AppError('Unauthorized: Invalid token', 401));
  }
};
