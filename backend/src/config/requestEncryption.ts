import crypto from 'crypto';

const configuredPrivateKey = process.env.REQUEST_ENCRYPTION_PRIVATE_KEY?.replace(/\\n/g, '\n');

const generatedKeys = configuredPrivateKey
  ? null
  : crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

const privateKey = configuredPrivateKey || generatedKeys!.privateKey;
const derivedPublicKey = crypto.createPublicKey(privateKey).export({
  type: 'spki',
  format: 'pem',
}) as string;
const publicKey = process.env.REQUEST_ENCRYPTION_PUBLIC_KEY?.replace(/\\n/g, '\n') || derivedPublicKey;

export const getPublicEncryptionKey = () => publicKey;

export const decryptSensitiveField = (encryptedValue: string): string => {
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encryptedValue, 'base64')
  );

  return decrypted.toString('utf8');
};

export const encryptForCurrentPublicKey = (value: string): string => {
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(value, 'utf8')
  ).toString('base64');
};

export const plaintextSensitiveFieldsAllowed = () =>
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_PLAINTEXT_SENSITIVE_FIELDS === 'true';

export const readSensitiveField = (
  body: Record<string, unknown>,
  fieldName: string
): string | undefined => {
  const encryptedName = `encrypted${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`;
  const encryptedValue = body[encryptedName];
  if (typeof encryptedValue === 'string' && encryptedValue) {
    return decryptSensitiveField(encryptedValue);
  }

  const plainValue = body[fieldName];
  if (typeof plainValue === 'string' && plaintextSensitiveFieldsAllowed()) {
    return plainValue;
  }

  return undefined;
};
