import Decimal from 'decimal.js';
import { UserError } from './validation';
export function parseMoney(input: string): Decimal {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(input.trim()))
    throw new UserError('Use a nonnegative amount with at most two decimal places.', 'amount');
  return new Decimal(input.trim());
}
export function remaining(target: Decimal, paid: Decimal) {
  return Decimal.max(target.minus(paid), 0);
}
export function money(value: { toString(): string }) {
  return new Decimal(value.toString()).toFixed(2);
}
