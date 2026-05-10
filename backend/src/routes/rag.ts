import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  askQuestion,
  listConversations,
  getConversation,
  deleteConversation,
  reindexNotes,
} from '../controllers/ragController';

const router = express.Router();

router.post('/ask', authenticate, askQuestion);
router.post('/reindex', authenticate, reindexNotes);
router.get('/conversations', authenticate, listConversations);
router.get('/conversations/:id', authenticate, getConversation);
router.delete('/conversations/:id', authenticate, deleteConversation);

export default router;
