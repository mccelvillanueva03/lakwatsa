import { beforeAll, afterAll, expect, test } from "vitest";
import { db } from "../src/lib/db";
import { register } from "../src/lib/auth-service";
import {
  createTrip,
  editTrip,
  mutateOption,
  mutateMember,
  redeemCode,
  claimMember,
  rotateCode,
  castVote,
  finalizeTrip,
  setPayment,
  readTrip,
} from "../src/lib/trips";
const enabled = !!process.env.TEST_DATABASE_URL;
let token: string, other: string;
const input = {
  title: "Beach weekend",
  description: "Friends",
  timezone: "Asia/Manila",
  mode: "PLANNING" as const,
  contributionsEnabled: true,
  members: ["Ana", "Ben"],
  destinations: ["Beach", "Mountains"],
  dates: [
    { start: "2026-12-01T10:00", end: "2026-12-02T12:00" },
    { start: "2026-12-08T10:00", end: "2026-12-09T12:00" },
  ],
  contributions: ["1000.10", "1500.20"],
};
beforeAll(async () => {
  if (!enabled) return;
  await db.orm.public.Planner.where((row)=>row.email.like("%@trips.test")).deleteAll();
  token = (await register("owner@trips.test", "long enough password")).token;
  other = (await register("other@trips.test", "long enough password")).token;
});
afterAll(async () => {
  await db.close();
});
test.skipIf(!enabled)(
  "creation enforces mode, options, timezone, exact amounts, and ownership",
  async () => {
    await expect(
      createTrip(token, { ...input, destinations: ["One"] }),
    ).rejects.toThrow();
    await expect(
      createTrip(token, { ...input, timezone: "Nowhere/Invalid" }),
    ).rejects.toThrow();
    await expect(
      createTrip(token, { ...input, members: ["Ana", "Ana"] }),
    ).rejects.toThrow();
    const { trip } = await createTrip(token, input);
    await expect(
      editTrip(other, trip.id, { title: "Stolen" }),
    ).rejects.toThrow();
    const direct = await createTrip(token, {
      ...input,
      mode: "PLANNED",
      contributionsEnabled: false,
      contributions: [],
      destinations: ["Beach"],
      dates: [input.dates[0]],
    });
    expect(direct.trip.chosenDestinationId).toBeTruthy();
    expect(direct.trip.chosenDateId).toBeTruthy();
    expect(direct.trip.chosenContributionId).toBeNull();
    await expect(
      claimMember(
        { viewerToken: (await redeemCode(direct.code)).viewerToken },
        direct.trip.id,
        direct.trip.members[0].id,
      ),
    ).rejects.toThrow();
  },
);
test.skipIf(!enabled)(
  "viewer access, concurrent claims, vote replacement, ties, finalization, and payments",
  async () => {
    const { trip, code } = await createTrip(token, input);
    const access = await redeemCode(code);
    await expect(readTrip(trip.id, {})).rejects.toThrow();
    expect(
      (await readTrip(trip.id, { viewerToken: access.viewerToken })).title,
    ).toBe("Beach weekend");
    await expect(
      castVote(
        { viewerToken: access.viewerToken },
        trip.id,
        "destination",
        trip.destinations[0].id,
      ),
    ).rejects.toThrow();
    const claims = await Promise.allSettled([
      claimMember(
        { viewerToken: access.viewerToken },
        trip.id,
        trip.members[0].id,
      ),
      claimMember(
        { viewerToken: access.viewerToken },
        trip.id,
        trip.members[0].id,
      ),
    ]);
    expect(claims.filter((c) => c.status === "fulfilled")).toHaveLength(1);
    const claim = claims.find(
      (c) => c.status === "fulfilled",
    ) as PromiseFulfilledResult<{ token: string; expiresAt: Date }>;
    const identity = {
      viewerToken: access.viewerToken,
      memberToken: claim.value.token,
    };
    const foreign = await createTrip(token, input);
    await expect(
      castVote(
        identity,
        trip.id,
        "destination",
        foreign.trip.destinations[0].id,
      ),
    ).rejects.toThrow();
    await castVote(identity, trip.id, "destination", trip.destinations[0].id);
    await castVote(identity, trip.id, "destination", trip.destinations[1].id);
    expect(
      (await db.orm.public.Member.where({ id: trip.members[0].id }).firstOrThrow())
        .destinationVoteId,
    ).toBe(trip.destinations[1].id);
    await expect(finalizeTrip(token, trip.id, {})).rejects.toThrow();
    expect(
      (await db.orm.public.Trip.where({ id: trip.id }).firstOrThrow()).mode,
    ).toBe("PLANNING");
    await finalizeTrip(token, trip.id, {
      date: trip.dates[0].id,
      contribution: trip.contributions[0].id,
    });
    await expect(
      castVote(identity, trip.id, "destination", trip.destinations[0].id),
    ).rejects.toThrow();
    await setPayment(token, trip.id, trip.members[0].id, "1200.25");
    await expect(
      setPayment(other, trip.id, trip.members[0].id, "1"),
    ).rejects.toThrow();
    await expect(
      setPayment(token, trip.id, trip.members[0].id, "-1"),
    ).rejects.toThrow();
    await editTrip(token, trip.id, { contributionsEnabled: false });
    expect(
      (
        await db.orm.public.Member.where({ id: trip.members[0].id }).firstOrThrow()
      ).amountPaid,
    ).toBe("1200.25");
    expect(
      (await db.orm.public.Trip.where({ id: trip.id }).firstOrThrow())
        .chosenContributionId,
    ).toBeNull();
    await expect(
      setPayment(token, trip.id, trip.members[0].id, "1"),
    ).rejects.toThrow();
    await editTrip(token, trip.id, {
      contributionsEnabled: true,
      contributionId: trip.contributions[1].id,
    });
  },
);
test.skipIf(!enabled)(
  "claim reset, option deletion, and access rotation revoke stale capabilities",
  async () => {
    const { trip, code } = await createTrip(token, input);
    const access = await redeemCode(code);
    const claim = await claimMember(
      { viewerToken: access.viewerToken },
      trip.id,
      trip.members[0].id,
    );
    const identity = {
      viewerToken: access.viewerToken,
      memberToken: claim.token,
    };
    await castVote(identity, trip.id, "destination", trip.destinations[0].id);
    await mutateOption(token, trip.id, "destination", "add", { name: "City" });
    await mutateOption(token, trip.id, "destination", "delete", {
      id: trip.destinations[0].id,
    });
    expect(
      (await db.orm.public.Member.where({ id: trip.members[0].id }).firstOrThrow())
        .destinationVoteId,
    ).toBeNull();
    await mutateMember(token, trip.id, "reset", { id: trip.members[0].id });
    await expect(
      castVote(identity, trip.id, "date", trip.dates[0].id),
    ).rejects.toThrow();
    await claimMember(
      { viewerToken: access.viewerToken },
      trip.id,
      trip.members[0].id,
    );
    const fresh = await rotateCode(token, trip.id);
    await expect(redeemCode(code)).rejects.toThrow();
    await expect(readTrip(trip.id, identity)).rejects.toThrow();
    expect((await redeemCode(fresh)).tripId).toBe(trip.id);
  },
);
test.skipIf(!enabled)(
  "database constraints reject cross-trip votes and invalid money/windows",
  async () => {
    const a = await createTrip(token, input),
      b = await createTrip(token, input);
    await expect(
      db.orm.public.Member.where({ id: a.trip.members[0].id }).update({ destinationVoteId: b.trip.destinations[0].id }),
    ).rejects.toThrow();
    await expect(
      db.orm.public.Member.where({ id: a.trip.members[0].id }).update({ amountPaid: "-1" }),
    ).rejects.toThrow();
    await expect(
      db.orm.public.DateOption.create({
          tripId: a.trip.id,
          start: new Date("2026-12-02"),
          end: new Date("2026-12-01"),
        }),
    ).rejects.toThrow();
  },
);
test.skipIf(!enabled)(
  "finalization races cannot leave a later vote",
  async () => {
    const { trip, code } = await createTrip(token, input);
    const viewer = await redeemCode(code);
    const member = await claimMember(
      { viewerToken: viewer.viewerToken },
      trip.id,
      trip.members[0].id,
    );
    await Promise.allSettled([
      finalizeTrip(token, trip.id, {
        destination: trip.destinations[0].id,
        date: trip.dates[0].id,
        contribution: trip.contributions[0].id,
      }),
      castVote(
        { viewerToken: viewer.viewerToken, memberToken: member.token },
        trip.id,
        "destination",
        trip.destinations[1].id,
      ),
    ]);
    expect(
      (await db.orm.public.Trip.where({ id: trip.id }).firstOrThrow()).mode,
    ).toBe("PLANNED");
    await expect(
      castVote(
        { viewerToken: viewer.viewerToken, memberToken: member.token },
        trip.id,
        "date",
        trip.dates[1].id,
      ),
    ).rejects.toThrow();
  },
);

test.skipIf(!enabled)(
  "Planned corrections can select existing owned options and reject foreign choices",
  async () => {
    const { trip } = await createTrip(token, input),
      foreign = await createTrip(token, input);
    await expect(
      editTrip(token, trip.id, { destinationId: trip.destinations[1].id }),
    ).rejects.toThrow();
    await finalizeTrip(token, trip.id, {
      destination: trip.destinations[0].id,
      date: trip.dates[0].id,
      contribution: trip.contributions[0].id,
    });
    await expect(
      editTrip(token, trip.id, {
        destinationId: foreign.trip.destinations[0].id,
      }),
    ).rejects.toThrow();
    await editTrip(token, trip.id, {
      destinationId: trip.destinations[1].id,
      dateId: trip.dates[1].id,
    });
    const changed = await db.orm.public.Trip.where({ id: trip.id }).firstOrThrow();
    expect(changed.mode).toBe("PLANNED");
    expect(changed.chosenDestinationId).toBe(trip.destinations[1].id);
    expect(changed.chosenDateId).toBe(trip.dates[1].id);
  },
);
