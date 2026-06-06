import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProviders,
  getModels,
  getAllModels,
  testConnection,
  generateSummary,
  extractKeywords,
  rewriteNote,
  chatCompletion,
  saveApiKey,
  deleteApiKey,
  getApiKeys,
} from '../controllers/llmController';
import { validateBody } from '../middleware/validate';
import {
  llmChatRequestSchema,
  llmContentRequestSchema,
  llmRewriteRequestSchema,
  providerKeyRequestSchema,
  providerTestRequestSchema,
} from '../schemas/apiSchemas';

const router = express.Router();

router.get('/providers', authenticate, getProviders);
router.get('/models', authenticate, getAllModels);
router.get('/models/:provider', authenticate, getModels);
router.post('/test', authenticate, validateBody(providerTestRequestSchema), testConnection);
router.post('/chat', authenticate, validateBody(llmChatRequestSchema), chatCompletion);
router.post('/summary', authenticate, validateBody(llmContentRequestSchema), generateSummary);
router.post('/keywords', authenticate, validateBody(llmContentRequestSchema), extractKeywords);
router.post('/rewrite', authenticate, validateBody(llmRewriteRequestSchema), rewriteNote);
router.get('/keys', authenticate, getApiKeys);
router.post('/keys', authenticate, validateBody(providerKeyRequestSchema), saveApiKey);
router.delete('/keys/:provider', authenticate, deleteApiKey);

export default router;
