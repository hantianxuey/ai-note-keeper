import express from 'express';
import {
  login,
  logout,
  me,
  register,
  resetPassword,
  sendPasswordResetCode,
  sendVerificationCode,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/verification-code', sendVerificationCode);
router.post('/password-reset-code', sendPasswordResetCode);
router.post('/reset-password', resetPassword);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
