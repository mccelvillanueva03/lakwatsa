import { expect, test } from 'vitest';
import { localToUtc } from '../src/lib/dates';
test('converts trip local dates to UTC', () => {
  expect(localToUtc('2026-11-01T10:00', 'Asia/Manila').toISOString()).toBe(
    '2026-11-01T02:00:00.000Z',
  );
});
test('rejects DST gaps and requires an offset for ambiguous times', () => {
  expect(() => localToUtc('2026-03-08T02:30', 'America/New_York')).toThrow();
  expect(() => localToUtc('2026-11-01T01:30', 'America/New_York')).toThrow();
  expect(localToUtc('2026-11-01T01:30', 'America/New_York', '-05:00').toISOString()).toBe(
    '2026-11-01T06:30:00.000Z',
  );
});
