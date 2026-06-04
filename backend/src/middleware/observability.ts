import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';
import { recordHttpRequest, routeLabelForMetrics } from '../observability/metrics';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const headerValue = req.headers['x-request-id'];
    const requestId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue || randomUUID();

    res.setHeader('X-Request-Id', requestId);
    return requestId;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    recordHttpRequest(
      req.method,
      routeLabelForMetrics(req.originalUrl || req.url),
      res.statusCode,
      durationSeconds
    );
  });

  next();
};
