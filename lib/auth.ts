import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { plannerForToken } from "./auth-service";
import type { Identity } from "./trips";
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};
export async function plannerToken() {
  // Prisma v8 generates tracing IDs; keep subsequent queries out of prerendering.
  await connection();
  return (await cookies()).get("planner_session")?.value;
}
export async function requirePlanner() {
  const planner = await plannerForToken(await plannerToken());
  if (!planner) redirect("/sign-in");
  return planner;
}
export async function identity(tripId: string): Promise<Identity> {
  await connection();
  const jar = await cookies();
  return {
    plannerToken: jar.get("planner_session")?.value,
    viewerToken: jar.get(`trip_access_${tripId}`)?.value,
    memberToken: jar.get(`member_session_${tripId}`)?.value,
  };
}
export async function setPlannerCookie(session: {
  token: string;
  expiresAt: Date;
}) {
  (await cookies()).set("planner_session", session.token, {
    ...cookieOptions,
    expires: session.expiresAt,
  });
}
