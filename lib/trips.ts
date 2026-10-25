import "server-only";
import { del } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { transaction } from "./db";
import { requirePlannerToken, plannerForToken } from "./auth-service";
import {
  newCode,
  hashToken,
  normalizeCode,
  signAccess,
  verifyAccess,
  newToken,
} from "./crypto";
import { UserError, text } from "./validation";
import { parseMoney } from "./money";
import { localToUtc } from "./dates";
import { chooseWinner } from "./voting";
export const tripInclude = {
  destinations: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  dates: { orderBy: { start: "asc" } },
  contributions: { orderBy: { amount: "asc" } },
  members: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { session: { select: { expiresAt: true } } },
  },
} satisfies Prisma.TripInclude;
export type FullTrip = Prisma.TripGetPayload<{ include: typeof tripInclude }>;
export type Identity = {
  plannerToken?: string;
  viewerToken?: string;
  memberToken?: string;
};
export type Category = "destination" | "date" | "contribution";
const categorySchema = z.enum(["destination", "date", "contribution"]);
export function accessSecret() {
  const secret = process.env.ACCESS_COOKIE_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("ACCESS_COOKIE_SECRET must contain at least 32 characters");
  return secret;
}
async function lockedTrip(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${id} FOR UPDATE`;
  const trip = await tx.trip.findUnique({
    where: { id },
    include: tripInclude,
  });
  if (!trip) throw new UserError("Trip unavailable.");
  return trip;
}
async function owned(
  tx: Prisma.TransactionClient,
  token: string | undefined,
  trip: FullTrip,
) {
  const planner = await requirePlannerToken(token, tx);
  if (trip.plannerId !== planner.id) throw new UserError("Trip unavailable.");
  return planner;
}
async function canRead(
  tx: Prisma.TransactionClient,
  identity: Identity,
  trip: FullTrip,
) {
  const planner = await plannerForToken(identity.plannerToken, tx);
  if (planner?.id === trip.plannerId) return;
  if (
    !identity.viewerToken ||
    !verifyAccess(
      identity.viewerToken,
      trip.id,
      trip.accessCodeVersion,
      accessSecret(),
    )
  )
    throw new UserError("Enter the current trip code to continue.");
}
export async function readTrip(id: string, identity: Identity) {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await canRead(tx, identity, trip);
    return trip;
  });
}
export async function memberForIdentity(
  tx: Prisma.TransactionClient,
  identity: Identity,
  trip: FullTrip,
) {
  await canRead(tx, identity, trip);
  if (!identity.memberToken)
    throw new UserError("Claim your member name to vote.");
  const session = await tx.memberSession.findUnique({
    where: { tokenHash: hashToken(identity.memberToken) },
    include: { member: true },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.member.tripId !== trip.id
  )
    throw new UserError("Your member claim expired or was reset.");
  return session.member;
}
const createSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
  timezone: z.string().min(1).max(100),
  mode: z.enum(["PLANNING", "PLANNED"]),
  contributionsEnabled: z.boolean(),
  members: z.array(z.string().trim().min(1).max(80)).min(1).max(100),
  destinations: z.array(z.string().trim().min(1).max(100)).min(1).max(30),
  dates: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
        startOffset: z.string().optional(),
        endOffset: z.string().optional(),
      }),
    )
    .min(1)
    .max(30),
  contributions: z.array(z.string()).max(30),
});
function dateWindow(
  input: {
    start: string;
    end: string;
    startOffset?: string;
    endOffset?: string;
  },
  timezone: string,
) {
  const start = localToUtc(
      input.start,
      timezone,
      input.startOffset || undefined,
    ),
    end = localToUtc(input.end, timezone, input.endOffset || undefined);
  if (end <= start)
    throw new UserError("End must be later than start.", "dates");
  return { start, end };
}
function unique(values: string[], field: string) {
  if (new Set(values).size !== values.length)
    throw new UserError(`Remove duplicate ${field}.`, field);
}
export async function createTrip(token: string | undefined, raw: unknown) {
  const input = createSchema.parse(raw);
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone });
  } catch {
    throw new UserError("Choose a valid IANA timezone.", "timezone");
  }
  const minimum = input.mode === "PLANNING" ? 2 : 1;
  if (
    input.destinations.length < minimum ||
    input.dates.length < minimum ||
    (input.contributionsEnabled && input.contributions.length < minimum)
  )
    throw new UserError(
      `Add at least ${minimum} option(s) per enabled category.`,
    );
  if (
    input.mode === "PLANNED" &&
    (input.destinations.length !== 1 ||
      input.dates.length !== 1 ||
      (input.contributionsEnabled && input.contributions.length !== 1))
  )
    throw new UserError("Planned trips need one settled option per category.");
  unique(input.members, "members");
  unique(input.destinations, "destinations");
  const dates = input.dates.map((d) => dateWindow(d, input.timezone));
  unique(
    dates.map((d) => d.start.toISOString() + d.end.toISOString()),
    "dates",
  );
  const amounts = input.contributionsEnabled
    ? input.contributions.map(parseMoney)
    : [];
  if (amounts.some((a) => a.lte(0)))
    throw new UserError("Contributions must be positive.", "contributions");
  unique(
    amounts.map((a) => a.toFixed(2)),
    "contributions",
  );
  const code = newCode();
  return transaction(async (tx) => {
    const planner = await requirePlannerToken(token, tx);
    let trip = await tx.trip.create({
      data: {
        plannerId: planner.id,
        title: input.title,
        description: input.description,
        mode: input.mode,
        timezone: input.timezone,
        contributionsEnabled: input.contributionsEnabled,
        accessCodeHash: hashToken(code),
        members: { create: input.members.map((name) => ({ name })) },
        destinations: { create: input.destinations.map((name) => ({ name })) },
        dates: { create: dates },
        contributions: { create: amounts.map((amount) => ({ amount })) },
      },
      include: tripInclude,
    });
    if (input.mode === "PLANNED")
      trip = await tx.trip.update({
        where: { id: trip.id },
        data: {
          chosenDestinationId: trip.destinations[0].id,
          chosenDateId: trip.dates[0].id,
          chosenContributionId: input.contributionsEnabled
            ? trip.contributions[0].id
            : null,
          finalizedAt: new Date(),
        },
        include: tripInclude,
      });
    return { trip, code };
  });
}
export async function redeemCode(raw: string) {
  const normalized = normalizeCode(raw);
  if (!/^[A-Z2-9]{12}$/.test(normalized))
    throw new UserError("Invalid trip code.", "code");
  return transaction(async (tx) => {
    const found = await tx.trip.findUnique({
      where: { accessCodeHash: hashToken(normalized) },
    });
    if (!found) throw new UserError("Invalid trip code.", "code");
    const trip = await lockedTrip(tx, found.id);
    if (trip.accessCodeHash !== hashToken(normalized))
      throw new UserError("Invalid trip code.", "code");
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    return {
      tripId: trip.id,
      mode: trip.mode,
      viewerToken: signAccess(
        trip.id,
        trip.accessCodeVersion,
        accessSecret(),
        expiresAt.getTime(),
      ),
      expiresAt,
    };
  });
}
export async function rotateCode(token: string | undefined, id: string) {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await owned(tx, token, trip);
    const code = newCode();
    await tx.trip.update({
      where: { id },
      data: {
        accessCodeHash: hashToken(code),
        accessCodeVersion: { increment: 1 },
      },
    });
    return code;
  });
}
export async function claimMember(
  identity: Identity,
  id: string,
  memberId: string,
) {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await canRead(tx, identity, trip);
    if (trip.mode !== "PLANNING") throw new UserError("Voting is closed.");
    const member = trip.members.find((m) => m.id === memberId);
    if (!member) throw new UserError("Choose an available member.", "member");
    const session = await tx.memberSession.findUnique({ where: { memberId } });
    if (session && session.expiresAt > new Date())
      throw new UserError("This member is already claimed.", "member");
    if (session) await tx.memberSession.delete({ where: { memberId } });
    const token = newToken(),
      expiresAt = new Date(Date.now() + 30 * 86400000);
    await tx.memberSession.create({
      data: { memberId, tokenHash: hashToken(token), expiresAt },
    });
    return { token, expiresAt };
  });
}
export async function currentMember(id: string, identity: Identity) {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    try {
      return await memberForIdentity(tx, identity, trip);
    } catch (error) {
      if (error instanceof UserError) return null;
      throw error;
    }
  });
}
export async function editTrip(
  token: string | undefined,
  id: string,
  input: {
    title?: string;
    description?: string;
    timezone?: string;
    contributionsEnabled?: boolean;
    contributionId?: string;
    destinationId?: string;
    dateId?: string;
  },
) {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await owned(tx, token, trip);
    const data: Prisma.TripUpdateInput = {};
    if (input.destinationId !== undefined || input.dateId !== undefined) {
      if (trip.mode !== "PLANNED")
        throw new UserError(
          "Finalize the trip before correcting settled choices.",
        );
      if (input.destinationId !== undefined) {
        if (!trip.destinations.some((o) => o.id === input.destinationId))
          throw new UserError(
            "Choose a destination from this trip.",
            "destinationId",
          );
        data.chosenDestination = { connect: { id: input.destinationId } };
      }
      if (input.dateId !== undefined) {
        if (!trip.dates.some((o) => o.id === input.dateId))
          throw new UserError("Choose dates from this trip.", "dateId");
        data.chosenDate = { connect: { id: input.dateId } };
      }
    }

    if (input.title !== undefined) data.title = text(input.title, "title");
    if (input.description !== undefined) {
      if (input.description.length > 2000)
        throw new UserError("Description is too long.", "description");
      data.description = input.description.trim();
    }
    if (input.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: input.timezone });
      } catch {
        throw new UserError("Invalid timezone.", "timezone");
      }
      data.timezone = input.timezone;
    }
    if (input.contributionsEnabled !== undefined) {
      data.contributionsEnabled = input.contributionsEnabled;
      if (!input.contributionsEnabled)
        data.chosenContribution = { disconnect: true };
      else if (trip.mode === "PLANNED") {
        const option = trip.contributions.find(
          (c) => c.id === (input.contributionId || trip.chosenContributionId),
        );
        if (!option)
          throw new UserError(
            "Choose a contribution target.",
            "contributionId",
          );
        data.chosenContribution = { connect: { id: option.id } };
      } else if (trip.contributions.length < 2)
        throw new UserError(
          "Add at least two contribution options before enabling contributions.",
        );
    }
    return tx.trip.update({ where: { id }, data });
  });
}
export async function mutateMember(
  token: string | undefined,
  id: string,
  operation: "add" | "rename" | "delete" | "reset",
  input: { id?: string; name?: string },
) {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await owned(tx, token, trip);
    if (operation === "add") {
      if (trip.members.length >= 100)
        throw new UserError("Maximum 100 members.");
      return tx.member.create({
        data: { tripId: id, name: text(input.name, "name", 80) },
      });
    }
    const member = trip.members.find((m) => m.id === input.id);
    if (!member) throw new UserError("Member unavailable.");
    if (operation === "reset")
      return tx.memberSession.deleteMany({ where: { memberId: member.id } });
    if (operation === "rename")
      return tx.member.update({
        where: { id: member.id },
        data: { name: text(input.name, "name", 80) },
      });
    if (operation !== "delete") throw new UserError("Invalid operation.");
    if (trip.members.length <= 1)
      throw new UserError("Keep at least one member.");
    if (!member.amountPaid.isZero())
      throw new UserError(
        "Set this member’s payment to zero before removing them.",
      );
    return tx.member.delete({ where: { id: member.id } });
  });
}
export async function mutateOption(
  token: string | undefined,
  id: string,
  rawCategory: string,
  operation: "add" | "edit" | "delete",
  input: {
    id?: string;
    name?: string;
    amount?: string;
    start?: string;
    end?: string;
    startOffset?: string;
    endOffset?: string;
  },
) {
  const category = categorySchema.parse(rawCategory);
  const result = await transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await owned(tx, token, trip);
    const options =
      category === "destination"
        ? trip.destinations
        : category === "date"
          ? trip.dates
          : trip.contributions;
    if (operation !== "add" && !options.some((o) => o.id === input.id))
      throw new UserError("Option unavailable.");
    if (operation === "delete") {
      if (trip.mode === "PLANNED")
        throw new UserError("Edit the settled option instead.");
      const min =
        category === "contribution" && !trip.contributionsEnabled ? 0 : 2;
      if (options.length <= min)
        throw new UserError(`Keep at least ${min} options.`);
      if (category === "destination")
        return tx.destinationOption.delete({ where: { id: input.id } });
      if (category === "date")
        return tx.dateOption.delete({ where: { id: input.id } });
      return tx.contributionOption.delete({ where: { id: input.id } });
    }
    if (operation !== "add" && operation !== "edit")
      throw new UserError("Invalid operation.");
    if (
      operation === "add" &&
      trip.mode === "PLANNED" &&
      !(category === "contribution" && !trip.contributionsEnabled)
    )
      throw new UserError("Edit the settled option instead.");
    if (operation === "add" && options.length >= 30)
      throw new UserError("Maximum 30 options.");
    if (category === "destination") {
      const data = { name: text(input.name, "name") };
      return operation === "add"
        ? tx.destinationOption.create({ data: { tripId: id, ...data } })
        : tx.destinationOption.update({ where: { id: input.id }, data });
    }
    if (category === "date") {
      const data = dateWindow(
        {
          start: input.start || "",
          end: input.end || "",
          startOffset: input.startOffset,
          endOffset: input.endOffset,
        },
        trip.timezone,
      );
      return operation === "add"
        ? tx.dateOption.create({ data: { tripId: id, ...data } })
        : tx.dateOption.update({ where: { id: input.id }, data });
    }
    const amount = parseMoney(input.amount || "");
    if (amount.lte(0))
      throw new UserError("Contribution must be positive.", "amount");
    return operation === "add"
      ? tx.contributionOption.create({ data: { tripId: id, amount } })
      : tx.contributionOption.update({
          where: { id: input.id },
          data: { amount },
        });
  });
  if (operation === "delete" && "imageUrl" in result && result.imageUrl) {
    await del(result.imageUrl).catch(() =>
      console.error("Deleted destination image cleanup failed"),
    );
  }
  return result;
}
export async function castVote(
  identity: Identity,
  id: string,
  rawCategory: string,
  optionId: string,
) {
  const category = categorySchema.parse(rawCategory);
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    const member = await memberForIdentity(tx, identity, trip);
    if (trip.mode !== "PLANNING") throw new UserError("Voting is closed.");
    if (category === "contribution" && !trip.contributionsEnabled)
      throw new UserError("Contributions are disabled.");
    const options =
      category === "destination"
        ? trip.destinations
        : category === "date"
          ? trip.dates
          : trip.contributions;
    if (!options.some((o) => o.id === optionId))
      throw new UserError("Option unavailable.");
    return tx.member.update({
      where: { id: member.id },
      data: { [`${category}VoteId`]: optionId },
    });
  });
}
export async function finalizeTrip(
  token: string | undefined,
  id: string,
  choices: Partial<Record<Category, string>>,
) {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await owned(tx, token, trip);
    if (trip.mode !== "PLANNING")
      throw new UserError("Trip is already planned.");
    const destination = chooseWinner(
      trip.destinations.map((o) => o.id),
      trip.members.map((m) => m.destinationVoteId),
      choices.destination,
    );
    const date = chooseWinner(
      trip.dates.map((o) => o.id),
      trip.members.map((m) => m.dateVoteId),
      choices.date,
    );
    const contribution = trip.contributionsEnabled
      ? chooseWinner(
          trip.contributions.map((o) => o.id),
          trip.members.map((m) => m.contributionVoteId),
          choices.contribution,
        )
      : null;
    return tx.trip.update({
      where: { id },
      data: {
        mode: "PLANNED",
        chosenDestinationId: destination,
        chosenDateId: date,
        chosenContributionId: contribution,
        finalizedAt: new Date(),
      },
    });
  });
}
export async function setPayment(
  token: string | undefined,
  id: string,
  memberId: string,
  value: string,
) {
  const amountPaid = parseMoney(value);
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await owned(tx, token, trip);
    if (!trip.contributionsEnabled)
      throw new UserError("Contributions are disabled.");
    if (!trip.members.some((m) => m.id === memberId))
      throw new UserError("Member unavailable.");
    return tx.member.update({ where: { id: memberId }, data: { amountPaid } });
  });
}
export async function withOwnedTrip<T>(
  token: string | undefined,
  id: string,
  work: (tx: Prisma.TransactionClient, trip: FullTrip) => Promise<T>,
): Promise<T> {
  return transaction(async (tx) => {
    const trip = await lockedTrip(tx, id);
    await owned(tx, token, trip);
    return work(tx, trip);
  });
}
