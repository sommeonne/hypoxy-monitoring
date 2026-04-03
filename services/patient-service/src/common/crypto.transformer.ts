import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || 'hypoxy-encryption-key-32-chars!!',
  'utf8',
).slice(0, 32);

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
      return value; // Return as-is if decryption fails (unencrypted legacy data)
    }
  },
};
