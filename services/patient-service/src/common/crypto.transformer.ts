import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

const ALGORITHM = 'aes-256-cbc';

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-char hex string.',
    );
  }
  return Buffer.from(raw, 'hex');
}

const KEY = loadKey();

export const encryptTransformer: ValueTransformer = {
  to(value: string | null): string | null {
    if (!value) return null;
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  },
  from(value: string | null): string | null {
    if (!value) return null;
    try {
      const [ivHex, encryptedHex] = value.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const decipher = createDecipheriv(ALGORITHM, KEY, iv);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      throw new Error('Patient field decryption failed');
    }
  },
};
