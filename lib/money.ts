import { Prisma } from "@prisma/client";
import { UserError } from "./validation";
export function parseMoney(input: string): Prisma.Decimal {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(input.trim()))
    throw new UserError(
      "Use a nonnegative amount with at most two decimal places.",
      "amount",
    );
  return new Prisma.Decimal(input.trim());
}
export function remaining(target: Prisma.Decimal, paid: Prisma.Decimal) {
  return Prisma.Decimal.max(target.minus(paid), 0);
}
export function money(value: { toString(): string }) {
  return new Prisma.Decimal(value.toString()).toFixed(2);
}
