import { expect, test } from "vitest";
import {
  hashPassword,
  verifyPassword,
  hashToken,
  newToken,
  signAccess,
  verifyAccess,
} from "../src/lib/crypto";
test("salts scrypt passwords and rejects incorrect passwords", async () => {
  const first = await hashPassword("long enough password");
  const second = await hashPassword("long enough password");
  expect(first.hash).not.toBe(second.hash);
  expect(await verifyPassword("long enough password", first)).toBe(true);
  expect(await verifyPassword("incorrect", first)).toBe(false);
});
test("opaque tokens are random and stored as hashes", () => {
  const token = newToken();
  expect(token.length).toBeGreaterThanOrEqual(40);
  expect(newToken()).not.toBe(token);
  expect(hashToken(token)).not.toBe(token);
});
test("signed trip access rejects tampering, wrong versions and expiry", () => {
  const secret = "test-secret-with-at-least-32-characters";
  const token = signAccess("trip", 2, secret, 10000);
  expect(verifyAccess(token, "trip", 2, secret, 9000)).toBe(true);
  expect(verifyAccess(token + "x", "trip", 2, secret, 9000)).toBe(false);
  expect(verifyAccess(token, "trip", 3, secret, 9000)).toBe(false);
  expect(verifyAccess(token, "trip", 2, secret, 11000)).toBe(false);
});
