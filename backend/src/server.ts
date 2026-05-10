require('dotenv').config();
import express from 'express';
import cors from 'cors';
import { errorHandler, AppError } from './middleware/errorHandler';
import { vectorSearchService } from './services/vectorSearchService';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Note Keeper API is running' });
});

import authRoutes from './routes/auth';
import noteRoutes from './routes/notes';
import llmRoutes from './routes/llm';
import embeddingRoutes from './routes/embedding';
import ragRoutes from './routes/rag';
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
