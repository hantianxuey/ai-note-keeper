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

const router = express.Router();

router.get('/providers', authenticate, getProviders);
router.get('/models', authenticate, getAllModels);
router.get('/models/:provider', authenticate, getModels);
router.post('/test', authenticate, testConnection);
router.post('/chat', authenticate, chatCompletion);
router.post('/summary', authenticate, generateSummary);
router.post('/keywords', authenticate, extractKeywords);
router.post('/rewrite', authenticate, rewriteNote);
router.get('/keys', authenticate, getApiKeys);
router.post('/keys', authenticate, saveApiKey);
router.delete('/keys/:provider', authenticate, deleteApiKey);

export default router;
