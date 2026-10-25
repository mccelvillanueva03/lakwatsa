import { beforeAll, afterAll, expect, test } from "vitest";
import { db } from "../lib/db";
import {
  register,
  login,
  logout,
  plannerForToken,
  updateAccount,
} from "../lib/auth-service";
const enabled = !!process.env.TEST_DATABASE_URL;
beforeAll(async () => {
  if (enabled)
    await db.planner.deleteMany({
      where: { email: { endsWith: "@auth.test" } },
    });
});
afterAll(async () => {
  await db.$disconnect();
});
test.skipIf(!enabled)(
  "registration, identifier login, expiration, logout, password revocation",
  async () => {
    const first = await register(
      "  PERSON@auth.test ",
      "correct horse battery",
    );
    expect((await plannerForToken(first.token))?.email).toBe(
      "person@auth.test",
    );
    await expect(
      register("person@auth.test", "correct horse battery"),
    ).rejects.toThrow();
    await updateAccount(first.token, { username: "Travel_Person" });
    const next = await login("TRAVEL_PERSON", "correct horse battery");
    await expect(login("travel_person", "wrong password")).rejects.toThrow();
    await logout(next.token);
    expect(await plannerForToken(next.token)).toBeNull();
    const current = await updateAccount(first.token, {
      currentPassword: "correct horse battery",
      password: "new correct horse battery",
    });
    expect(await plannerForToken(first.token)).toBeNull();
    expect((await plannerForToken(current!.token))?.email).toBe(
      "person@auth.test",
    );
    await db.plannerSession.updateMany({
      where: { plannerId: first.planner.id },
      data: { expiresAt: new Date(0) },
    });
    expect(await plannerForToken(current!.token)).toBeNull();
  },
);
