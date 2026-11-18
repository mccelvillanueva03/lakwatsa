import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ close: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('@prisma/orm-postgres/runtime', () => ({ default: createClient }));
const cache = globalThis as unknown as {
  tripDbV8?: ReturnType<typeof createClient>;
  tripDbV8Key?: string;
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete cache.tripDbV8;
  delete cache.tripDbV8Key;
});
afterEach(() => {
  delete cache.tripDbV8;
  delete cache.tripDbV8Key;
});
test('replaces a legacy client cached before the generated contract changed', async () => {
  const stale = { close: vi.fn().mockResolvedValue(undefined) };
  cache.tripDbV8 = stale;
  const { db } = await import('../src/lib/db');
  expect(db).not.toBe(stale);
  expect(createClient).toHaveBeenCalledOnce();
  expect(stale.close).toHaveBeenCalledOnce();
});
test('reuses a client across reloads when its contract and connection match', async () => {
  const first = (await import('../src/lib/db')).db;
  vi.resetModules();
  expect((await import('../src/lib/db')).db).toBe(first);
  expect(createClient).toHaveBeenCalledOnce();
});
test('replaces a client whose contract fingerprint no longer matches', async () => {
  const first = (await import('../src/lib/db')).db;
  cache.tripDbV8Key = 'old-contract';
  vi.resetModules();
  expect((await import('../src/lib/db')).db).not.toBe(first);
  expect(createClient).toHaveBeenCalledTimes(2);
  expect(first.close).toHaveBeenCalledOnce();
});
