import { beforeAll, afterAll, expect, test } from "vitest";
import { db } from "../src/lib/db";
import {
  register,
  login,
  logout,
  plannerForToken,
  updateAccount,
} from "../src/lib/auth-service";
const enabled = !!process.env.TEST_DATABASE_URL;
beforeAll(async () => {
  if (enabled)
    await db.orm.public.Planner.where((row)=>row.email.like("%@auth.test")).deleteAll();
});
afterAll(async () => {
  await db.close();
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
    await db.orm.public.PlannerSession.where({ plannerId: first.planner.id }).updateAll({ expiresAt: new Date(0) });
    expect(await plannerForToken(current!.token)).toBeNull();
  },
);
