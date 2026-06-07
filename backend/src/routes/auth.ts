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
import { validateBody } from '../middleware/validate';
import {
  authPasswordRequestSchema,
  resetPasswordRequestSchema,
  verificationCodeRequestSchema,
} from '../schemas/apiSchemas';

const router = express.Router();

router.post('/verification-code', validateBody(verificationCodeRequestSchema), sendVerificationCode);
router.post('/password-reset-code', validateBody(verificationCodeRequestSchema), sendPasswordResetCode);
router.post('/reset-password', validateBody(resetPasswordRequestSchema), resetPassword);
router.post('/register', validateBody(resetPasswordRequestSchema), register);
router.post('/login', validateBody(authPasswordRequestSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export default router;
