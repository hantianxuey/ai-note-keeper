import express from 'express';
import { register, login, me, sendVerificationCode } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/verification-code', sendVerificationCode);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);

export default router;
