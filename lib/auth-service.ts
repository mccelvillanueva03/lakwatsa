import "server-only";
import { Prisma } from "@prisma/client";
import { db, transaction } from "./db";
import { hashPassword, verifyPassword, newToken, hashToken } from "./crypto";
import {
  emailSchema,
  usernameSchema,
  passwordSchema,
  UserError,
} from "./validation";
const SESSION_MS = 30 * 86400000;
export async function plannerForToken(
  token?: string,
  client: Prisma.TransactionClient = db,
) {
  if (!token || token.length > 128) return null;
  const session = await client.plannerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { planner: true },
  });
  return session && session.expiresAt > new Date() ? session.planner : null;
}
export async function requirePlannerToken(
  token?: string,
  client: Prisma.TransactionClient = db,
) {
  const planner = await plannerForToken(token, client);
  if (!planner) throw new UserError("Please sign in again.");
  return planner;
}
async function sessionFor(plannerId: string, client: Prisma.TransactionClient) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await client.plannerSession.create({
    data: { plannerId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}
export async function register(email: string, password: string) {
  const normalized = emailSchema.parse(email.trim());
  passwordSchema.parse(password);
  const saved = await hashPassword(password);
  return transaction(async (tx) => {
    const planner = await tx.planner.create({
      data: { email: normalized, ...saved },
    });
    return { planner, ...(await sessionFor(planner.id, tx)) };
  });
}
export async function login(identifier: string, password: string) {
  if (password.length > 128 || identifier.length > 254)
    throw new UserError("Invalid credentials.");
  const normalized = identifier.trim().toLowerCase();
  return transaction(async (tx) => {
    const planner = await tx.planner.findFirst({
      where: normalized.includes("@")
        ? { email: normalized }
        : { username: normalized },
    });
    // Always derive a hash, including for unknown accounts.
    const valid = await verifyPassword(
      password,
      planner ?? {
        salt: "00000000000000000000000000000000",
        hash: "0".repeat(128),
      },
    );
    if (!planner || !valid) throw new UserError("Invalid credentials.");
    await tx.$queryRaw`SELECT id FROM "Planner" WHERE id = ${planner.id} FOR UPDATE`;
    return { planner, ...(await sessionFor(planner.id, tx)) };
  });
}
export async function logout(token?: string) {
  if (token)
    await db.plannerSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
}
export async function updateAccount(
  token: string | undefined,
  input: { username?: string; currentPassword?: string; password?: string },
) {
  return transaction(async (tx) => {
    const planner = await requirePlannerToken(token, tx);
    await tx.$queryRaw`SELECT id FROM "Planner" WHERE id = ${planner.id} FOR UPDATE`;
    if (input.password !== undefined) {
      passwordSchema.parse(input.password);
      if (
        !input.currentPassword ||
        !(await verifyPassword(input.currentPassword, planner))
      )
        throw new UserError(
          "Current password is incorrect.",
          "currentPassword",
        );
      const saved = await hashPassword(input.password);
      await tx.planner.update({ where: { id: planner.id }, data: saved });
      await tx.plannerSession.deleteMany({ where: { plannerId: planner.id } });
      return sessionFor(planner.id, tx);
    }
    const username = input.username?.trim()
      ? usernameSchema.parse(input.username)
      : null;
    await tx.planner.update({ where: { id: planner.id }, data: { username } });
    return null;
  });
}
