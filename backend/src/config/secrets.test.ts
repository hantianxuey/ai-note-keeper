import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, isEncryptedSecret } from './secrets';

describe('secret encryption', () => {
  const env = {
    API_KEY_ENCRYPTION_SECRET: 'test-encryption-secret-with-enough-entropy',
  };

  it('encrypts and decrypts API keys', () => {
    const encrypted = encryptSecret('sk-live-secret', env);

    expect(encrypted).not.toBe('sk-live-secret');
    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(decryptSecret(encrypted, env)).toBe('sk-live-secret');
  });

  it('leaves historical plaintext secrets readable', () => {
    expect(decryptSecret('legacy-plaintext-key', env)).toBe('legacy-plaintext-key');
  });
});
