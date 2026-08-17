import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const VERSION = 'v1';

export function parseSecretKey(raw: string): Buffer {
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return scryptSync(raw, 'foundry-secrets', 32);
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptSecret(payload: string, key: Buffer): string {
  const [version, ivPart, tagPart, dataPart] = payload.split('.');
  if (
    version !== VERSION ||
    ivPart === undefined ||
    tagPart === undefined ||
    dataPart === undefined
  ) {
    throw new Error('invalid secret box');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export type SecretBox = {
  encrypt(plaintext: string): string;
  decrypt(payload: string): string;
};

export function createSecretBox(rawKey: string): SecretBox {
  const key = parseSecretKey(rawKey);
  return {
    encrypt(plaintext) {
      return encryptSecret(plaintext, key);
    },
    decrypt(payload) {
      return decryptSecret(payload, key);
    },
  };
}
