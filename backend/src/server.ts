require('dotenv').config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, AppError } from './middleware/errorHandler';
import { vectorSearchService } from './services/vectorSearchService';
import { createReadinessSnapshot } from './services/healthService';
import { getAllowedOrigins, isOriginAllowed } from './config/cors';
import { getAuthRateLimitConfig, getRequestBodyLimit } from './config/security';
import { logger } from './config/logger';
import { metricsMiddleware, requestLogger } from './middleware/observability';
import { metricsRegistry } from './observability/metrics';
import { openApiSpec, swaggerHtml } from './docs/openapi';

const app = express();
const PORT = process.env.PORT || 3000;
const requestBodyLimit = getRequestBodyLimit();
const authRateLimitConfig = getAuthRateLimitConfig();

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const allowedOrigins = getAllowedOrigins();

app.disable('x-powered-by');
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

const authRateLimiter = rateLimit({
  ...authRateLimitConfig,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AI Note Keeper API is running' });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', message: 'AI Note Keeper API is running' });
});

app.get('/health/ready', async (_req, res, next) => {
  try {
    const snapshot = await createReadinessSnapshot();
    res.status(snapshot.httpStatus).json(snapshot.body);
  } catch (error) {
    next(error);
  }
});

app.get('/metrics', async (_req, res, next) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  } catch (error) {
    next(error);
  }
});

app.get('/api/docs/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.get('/api/docs', (_req, res) => {
  res.type('html').send(swaggerHtml);
});

import authRoutes from './routes/auth';
import noteRoutes from './routes/notes';
import llmRoutes from './routes/llm';
import embeddingRoutes from './routes/embedding';
import ragRoutes from './routes/rag';
import securityRoutes from './routes/security';
import attachmentRoutes from './routes/attachments';
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/verification-code', authRateLimiter);
app.use('/api/auth/password-reset-code', authRateLimiter);
app.use('/api/auth/reset-password', authRateLimiter);
app.use('/api/security', securityRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/embedding', embeddingRoutes);
app.use('/api/rag', ragRoutes);

app.use('/api', (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorHandler);

app.listen(PORT, async () => {
  logger.info({ port: PORT }, `Server is running on http://localhost:${PORT}`);
  logger.info({ environment: process.env.NODE_ENV || 'development' }, 'Environment loaded');
  if (process.env.REINDEX_ON_STARTUP !== 'true') {
    logger.info('Startup reindex skipped. Set REINDEX_ON_STARTUP=true to enable it.');
    return;
  }

  logger.info('Reindexing all notes...');
  try {
    const count = await vectorSearchService.reindexAllNotes();
    logger.info({ count }, 'Successfully reindexed notes');
  } catch (error) {
    logger.error({ err: error }, 'Failed to reindex notes');
  }
});

export default app;
