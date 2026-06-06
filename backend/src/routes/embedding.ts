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
import { validateBody } from '../middleware/validate';
import { providerKeyRequestSchema, providerTestRequestSchema } from '../schemas/apiSchemas';

const router = express.Router();

router.get('/providers', authenticate, getEmbeddingProviders);
router.get('/models', authenticate, getEmbeddingModels);
router.post('/test', authenticate, validateBody(providerTestRequestSchema), testEmbeddingConnection);
router.get('/keys', authenticate, getEmbeddingApiKeys);
router.post('/keys', authenticate, validateBody(providerKeyRequestSchema), saveEmbeddingApiKey);
router.delete('/keys/:provider', authenticate, deleteEmbeddingApiKey);

export default router;
