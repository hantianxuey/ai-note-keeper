import { describe, expect, it } from 'vitest';
import { decryptSensitiveField, encryptForCurrentPublicKey, getPublicEncryptionKey } from './requestEncryption';

describe('requestEncryption', () => {
  it('decrypts payloads encrypted with the current public key', () => {
    const publicKey = getPublicEncryptionKey();
    const encrypted = encryptForCurrentPublicKey('secret-password');

    expect(publicKey).toContain('BEGIN PUBLIC KEY');
    expect(decryptSensitiveField(encrypted)).toBe('secret-password');
  });
});
