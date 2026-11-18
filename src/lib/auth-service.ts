import 'server-only';
import { db, transaction, type Tx } from './db';
import { hashPassword, verifyPassword, newToken, hashToken } from './crypto';
import { emailSchema, usernameSchema, passwordSchema, UserError } from './validation';

const SESSION_MS = 30 * 86400000;
export async function plannerForToken(token?: string, client: Pick<Tx, 'orm'> = db) {
  if (!token || token.length > 128) return null;
  const session = await client.orm.public.PlannerSession.where({
    tokenHash: hashToken(token),
  }).first();
  return session && session.expiresAt > new Date()
    ? client.orm.public.Planner.where({ id: session.plannerId }).first()
    : null;
}

export async function requirePlannerToken(token?: string, client: Pick<Tx, 'orm'> = db) {
  const planner = await plannerForToken(token, client);
  if (!planner) throw new UserError('Please sign in again.');
  return planner;
}

async function sessionFor(plannerId: string, client: Pick<Tx, 'orm'>) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await client.orm.public.PlannerSession.create({
    plannerId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function register(email: string, password: string) {
  const normalized = emailSchema.parse(email.trim());
  passwordSchema.parse(password);
  const saved = await hashPassword(password);
  return transaction(async (tx) => {
    const planner = await tx.orm.public.Planner.create({
      email: normalized,
      ...saved,
    });
    return { planner, ...(await sessionFor(planner.id, tx)) };
  });
}

export async function login(identifier: string, password: string) {
  if (password.length > 128 || identifier.length > 254) throw new UserError('Invalid credentials.');
  const normalized = identifier.trim().toLowerCase();
  return transaction(async (tx) => {
    const planner = await tx.orm.public.Planner.where(
      normalized.includes('@') ? { email: normalized } : { username: normalized },
    ).first();
    // Always derive a hash, including for unknown accounts.
    const valid = await verifyPassword(
      password,
      planner ?? {
        salt: '00000000000000000000000000000000',
        hash: '0'.repeat(128),
      },
    );
    if (!planner || !valid) throw new UserError('Invalid credentials.');
    await tx.orm.public.Planner.where({ id: planner.id }).forUpdate().firstOrThrow();
    return { planner, ...(await sessionFor(planner.id, tx)) };
  });
}

export async function logout(token?: string) {
  if (token)
    await db.orm.public.PlannerSession.where({
      tokenHash: hashToken(token),
    }).deleteAll();
}

export async function updateAccount(
  token: string | undefined,
  input: { username?: string; currentPassword?: string; password?: string },
) {
  return transaction(async (tx) => {
    const planner = await requirePlannerToken(token, tx);
    await tx.orm.public.Planner.where({ id: planner.id }).forUpdate().firstOrThrow();
    if (input.password !== undefined) {
      passwordSchema.parse(input.password);
      if (!input.currentPassword || !(await verifyPassword(input.currentPassword, planner)))
        throw new UserError('Current password is incorrect.', 'currentPassword');
      const saved = await hashPassword(input.password);
      await tx.orm.public.Planner.where({ id: planner.id }).update(saved);
      await tx.orm.public.PlannerSession.where({
        plannerId: planner.id,
      }).deleteAll();
      return sessionFor(planner.id, tx);
    }
    const username = input.username?.trim() ? usernameSchema.parse(input.username) : null;
    await tx.orm.public.Planner.where({ id: planner.id }).update({ username });
    return null;
  });
}
