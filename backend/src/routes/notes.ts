import express from 'express';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
} from '../controllers/noteController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, listNotes);
router.get('/search', authenticate, searchNotes);
router.get('/:id', authenticate, getNote);
router.post('/', authenticate, createNote);
router.put('/:id', authenticate, updateNote);
router.delete('/:id', authenticate, deleteNote);

export default router;
