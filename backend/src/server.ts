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

const app = express();
const PORT = process.env.PORT || 3000;
const requestBodyLimit = getRequestBodyLimit();
const authRateLimitConfig = getAuthRateLimitConfig();

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const allowedOrigins = getAllowedOrigins();

app.disable('x-powered-by');
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Note Keeper API is running' });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'ok', message: 'AI Note Keeper API is running' });
});

app.get('/health/ready', async (req, res, next) => {
  try {
    const snapshot = await createReadinessSnapshot();
    res.status(snapshot.httpStatus).json(snapshot.body);
  } catch (error) {
    next(error);
  }
});

import authRoutes from './routes/auth';
import noteRoutes from './routes/notes';
import llmRoutes from './routes/llm';
import embeddingRoutes from './routes/embedding';
import ragRoutes from './routes/rag';
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
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
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Reindexing all notes...');
  try {
    const count = await vectorSearchService.reindexAllNotes();
    console.log(`Successfully reindexed ${count} notes`);
  } catch (error) {
    console.error('Failed to reindex notes:', error);
  }
});

export default app;
