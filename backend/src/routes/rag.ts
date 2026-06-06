import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  askQuestion,
  listConversations,
  getConversation,
  deleteConversation,
  reindexNotes,
} from '../controllers/ragController';
import { validateBody } from '../middleware/validate';
import { ragAskRequestSchema } from '../schemas/apiSchemas';

const router = express.Router();

router.post('/ask', authenticate, validateBody(ragAskRequestSchema), askQuestion);
router.post('/reindex', authenticate, reindexNotes);
router.get('/conversations', authenticate, listConversations);
router.get('/conversations/:id', authenticate, getConversation);
router.delete('/conversations/:id', authenticate, deleteConversation);

export default router;
