import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = ((await derive(password, salt, 64)) as Buffer).toString('hex');
  return { salt, hash };
}
export async function verifyPassword(password: string, saved: { salt: string; hash: string }) {
  const actual = (await derive(password, saved.salt, 64)) as Buffer;
  const expected = Buffer.from(saved.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function newCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('');
}
export function normalizeCode(code: string) {
  return code.replace(/[\s-]/g, '').toUpperCase();
}
export function signAccess(trip: string, version: number, secret: string, expires: number) {
  const body = Buffer.from(JSON.stringify({ trip, version, expires })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
export function verifyAccess(
  raw: string,
  trip: string,
  version: number,
  secret: string,
  now = Date.now(),
) {
  try {
    const [body, signature, extra] = raw.split('.');
    if (extra || !signature || raw.length > 2048) return false;
    const expected = createHmac('sha256', secret).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    return (
      data.trip === trip &&
      data.version === version &&
      Number.isFinite(data.expires) &&
      data.expires > now
    );
  } catch {
    return false;
  }
}

// Separate the encryption key from the signing key while reusing the server secret.
const tripCodeKey = (secret: string) =>
  createHmac('sha256', secret).update('trip-code-encryption-v1').digest();
export function encryptTripCode(code: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tripCodeKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}
export function decryptTripCode(saved: string, secret: string, expectedHash: string) {
  const [iv, tag, encrypted] = saved.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', tripCodeKey(secret), iv);
  decipher.setAuthTag(tag);
  const code = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  if (hashToken(code) !== expectedHash) throw new Error('Saved trip code does not match.');
  return code;
}
