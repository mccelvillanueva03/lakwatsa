import { beforeAll, afterAll, test, expect, vi } from "vitest";
const storage = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));
vi.mock("@vercel/blob", () => storage);
import { db } from "../lib/db";
import { register } from "../lib/auth-service";
import { createTrip, mutateOption } from "../lib/trips";
import { replaceDestinationImage } from "../lib/uploads";
const enabled = !!process.env.TEST_DATABASE_URL;
let token: string, tripId: string, optionId: string;
beforeAll(async () => {
  if (!enabled) return;
  await db.planner.deleteMany({ where: { email: "upload@upload.test" } });
  token = (await register("upload@upload.test", "long enough password")).token;
  const { trip } = await createTrip(token, {
    title: "Images",
    timezone: "Asia/Manila",
    mode: "PLANNED",
    contributionsEnabled: false,
    members: ["Ana"],
    destinations: ["Beach"],
    dates: [{ start: "2026-12-01T10:00", end: "2026-12-02T10:00" }],
    contributions: [],
  });
  tripId = trip.id;
  optionId = trip.destinations[0].id;
});
afterAll(async () => {
  await db.$disconnect();
});
const file = () =>
  new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])],
    "image.png",
    { type: "image/png" },
  );
test.skipIf(!enabled)(
  "rejects unauthorized, forged, and oversized uploads before storing",
  async () => {
    await expect(
      replaceDestinationImage(undefined, tripId, optionId, file()),
    ).rejects.toThrow();
    await expect(
      replaceDestinationImage(
        token,
        tripId,
        optionId,
        new File(["not an image"], "fake.png", { type: "image/png" }),
      ),
    ).rejects.toThrow();
    await expect(
      replaceDestinationImage(
        token,
        tripId,
        optionId,
        new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow();
    expect(storage.put).not.toHaveBeenCalled();
  },
);
test.skipIf(!enabled)(
  "replaces only after DB success, rolls back new image on DB failure, and removes old image last",
  async () => {
    const old = "https://store.public.blob.vercel-storage.com/old.png",
      fresh = "https://store.public.blob.vercel-storage.com/fresh.png";
    await db.destinationOption.update({
      where: { id: optionId },
      data: { imageUrl: old },
    });
    storage.put.mockImplementation(async () => {
      expect(
        (
          await db.destinationOption.findUniqueOrThrow({
            where: { id: optionId },
          })
        ).imageUrl,
      ).toBe(old);
      return { url: fresh };
    });
    storage.del.mockImplementation(async (url: string) => {
      expect(url).toBe(old);
      expect(
        (
          await db.destinationOption.findUniqueOrThrow({
            where: { id: optionId },
          })
        ).imageUrl,
      ).toBe(fresh);
    });
    await replaceDestinationImage(token, tripId, optionId, file());
    storage.put.mockImplementation(async () => {
      await db.destinationOption.delete({ where: { id: optionId } });
      return { url: fresh };
    });
    storage.del.mockReset();
    await expect(
      replaceDestinationImage(token, tripId, optionId, file()),
    ).rejects.toThrow();
    expect(storage.del).toHaveBeenCalledWith(fresh);
  },
);

test.skipIf(!enabled)(
  "deleting a destination removes its blob only after database success",
  async () => {
    const { trip } = await createTrip(token, {
      title: "Delete image",
      timezone: "Asia/Manila",
      mode: "PLANNING",
      contributionsEnabled: false,
      members: ["Ana"],
      destinations: ["Beach", "City", "Mountains"],
      dates: [
        { start: "2026-12-01T10:00", end: "2026-12-02T10:00" },
        { start: "2026-12-08T10:00", end: "2026-12-09T10:00" },
      ],
      contributions: [],
    });
    const option = trip.destinations[0];
    const url = "https://store.public.blob.vercel-storage.com/delete.png";
    await db.destinationOption.update({
      where: { id: option.id },
      data: { imageUrl: url },
    });
    storage.del.mockReset();
    storage.del.mockImplementation(async () => {
      expect(
        await db.destinationOption.findUnique({ where: { id: option.id } }),
      ).toBeNull();
    });
    await mutateOption(token, trip.id, "destination", "delete", {
      id: option.id,
    });
    expect(storage.del).toHaveBeenCalledWith(url);
  },
);
