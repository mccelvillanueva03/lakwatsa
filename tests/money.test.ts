import { expect, test } from 'vitest';
import { parseMoney, remaining } from '../src/lib/money';
test('keeps fractional payments exact and clamps overpayment balances', () => {
  expect(parseMoney('0.10').plus(parseMoney('0.20')).toFixed(2)).toBe('0.30');
  expect(remaining(parseMoney('10'), parseMoney('12')).toFixed(2)).toBe('0.00');
});
test.each(['-1', '1.001', 'NaN', '1e2', '10000000000', ''])(
  'rejects invalid monetary input %s',
  (value) => {
    expect(() => parseMoney(value)).toThrow();
  },
);
