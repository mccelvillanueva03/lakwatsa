import { expect, test } from 'vitest';
import {
  encryptTripCode,
  decryptTripCode,
  hashPassword,
  verifyPassword,
  hashToken,
  newToken,
  signAccess,
  verifyAccess,
} from '../src/lib/crypto';
test('salts scrypt passwords and rejects incorrect passwords', async () => {
  const first = await hashPassword('long enough password');
  const second = await hashPassword('long enough password');
  expect(first.hash).not.toBe(second.hash);
  expect(await verifyPassword('long enough password', first)).toBe(true);
  expect(await verifyPassword('incorrect', first)).toBe(false);
});
test('opaque tokens are random and stored as hashes', () => {
  const token = newToken();
  expect(token.length).toBeGreaterThanOrEqual(40);
  expect(newToken()).not.toBe(token);
  expect(hashToken(token)).not.toBe(token);
});
test('signed trip access rejects tampering, wrong versions and expiry', () => {
  const secret = 'test-secret-with-at-least-32-characters';
  const token = signAccess('trip', 2, secret, 10000);
  expect(verifyAccess(token, 'trip', 2, secret, 9000)).toBe(true);
  expect(verifyAccess(token + 'x', 'trip', 2, secret, 9000)).toBe(false);
  expect(verifyAccess(token, 'trip', 3, secret, 9000)).toBe(false);
  expect(verifyAccess(token, 'trip', 2, secret, 11000)).toBe(false);
});

test('saved trip codes are encrypted, authenticated, and bound to their hash', () => {
  const secret = 'test-secret-with-at-least-32-characters';
  const code = 'ABCDEFGH2345';
  const hash = hashToken(code);
  const saved = encryptTripCode(code, secret);
  expect(saved).not.toContain(code);
  expect(encryptTripCode(code, secret)).not.toBe(saved);
  expect(decryptTripCode(saved, secret, hash)).toBe(code);
  expect(() => decryptTripCode(saved, 'another-secret', hash)).toThrow();
  expect(() => decryptTripCode(saved, secret, hashToken('other'))).toThrow();
  const parts = saved.split('.');
  parts[2] = Buffer.alloc(12).toString('base64url');
  expect(() => decryptTripCode(parts.join('.'), secret, hash)).toThrow();
});
