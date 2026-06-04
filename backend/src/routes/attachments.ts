import express from 'express';
import multer from 'multer';
import {
  deleteAttachment,
  getAttachmentContent,
  imageUploadLimits,
  uploadNoteImage,
} from '../controllers/attachmentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: imageUploadLimits,
});

router.post('/notes/:id/images', authenticate, upload.single('image'), uploadNoteImage);
router.get('/attachments/:id/content', authenticate, getAttachmentContent);
router.delete('/attachments/:id', authenticate, deleteAttachment);

export default router;
