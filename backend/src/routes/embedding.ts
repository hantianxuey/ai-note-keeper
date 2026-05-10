import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEmbeddingProviders,
  getEmbeddingModels,
  testEmbeddingConnection,
  saveEmbeddingApiKey,
  deleteEmbeddingApiKey,
  getEmbeddingApiKeys,
} from '../controllers/embeddingController';

const router = express.Router();

router.get('/providers', authenticate, getEmbeddingProviders);
router.get('/models', authenticate, getEmbeddingModels);
router.post('/test', authenticate, testEmbeddingConnection);
router.get('/keys', authenticate, getEmbeddingApiKeys);
router.post('/keys', authenticate, saveEmbeddingApiKey);
router.delete('/keys/:provider', authenticate, deleteEmbeddingApiKey);

export default router;
