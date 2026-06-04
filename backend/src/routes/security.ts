import express from 'express';
import { getPublicEncryptionKey } from '../config/requestEncryption';

const router = express.Router();

router.get('/public-key', (_req, res) => {
  res.json({
    algorithm: 'RSA-OAEP-256',
    publicKey: getPublicEncryptionKey(),
  });
});

export default router;
