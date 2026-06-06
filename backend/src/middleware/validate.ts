import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from './errorHandler';

const validationMessage = (error: ZodError) =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
    .join('; ');

export const validateBody = (schema: ZodTypeAny) => (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    next(new AppError(validationMessage(result.error), 400));
    return;
  }

  req.body = result.data;
  next();
};
