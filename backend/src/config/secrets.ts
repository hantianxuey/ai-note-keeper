import crypto from 'crypto';

const ENCRYPTED_PREFIX = 'enc:v1:';

type SecretEnv = Partial<Record<'API_KEY_ENCRYPTION_SECRET' | 'JWT_SECRET' | 'NODE_ENV', string>>;

function resolveEncryptionSecret(env: SecretEnv = process.env): string {
  const secret = env.API_KEY_ENCRYPTION_SECRET || env.JWT_SECRET;
  if (secret) return secret;
  if (env.NODE_ENV === 'production') {
    throw new Error('API_KEY_ENCRYPTION_SECRET or JWT_SECRET is required to encrypt stored API keys');
  }
  return 'development-only-api-key-encryption-secret';
}

function keyFromSecret(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptSecret(value: string, env: SecretEnv = process.env): string {
  if (isEncryptedSecret(value)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromSecret(resolveEncryptionSecret(env)), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX.replace(/:$/, ''),
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptSecret(value: string, env: SecretEnv = process.env): string {
  if (!isEncryptedSecret(value)) return value;

  const [, , ivText, tagText, ciphertextText] = value.split(':');
  if (!ivText || !tagText || !ciphertextText) {
    throw new Error('Stored secret has an invalid encrypted format');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(resolveEncryptionSecret(env)),
    Buffer.from(ivText, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
