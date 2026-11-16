import { z } from "zod";
export class UserError extends Error {
  constructor(
    message: string,
    public field = "form",
  ) {
    super(message);
  }
}
export const emailSchema = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9_]+$/, "Use letters, numbers, and underscores.");
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128);
export function text(value: unknown, field: string, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new UserError(`Enter ${field} (1–${max} characters).`, field);
  return value.trim();
}
