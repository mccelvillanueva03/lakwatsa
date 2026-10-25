"use server";
import { revalidatePath } from "next/cache";
import {
  createTrip,
  editTrip,
  mutateOption,
  mutateMember,
  rotateCode,
  castVote,
  finalizeTrip,
  setPayment,
} from "@/lib/trips";
import { plannerToken, identity } from "@/lib/auth";
import { actionError } from "@/lib/action-errors";
import type { FormState } from "@/lib/form-state";
const value = (f: FormData, k: string) => String(f.get(k) || "");
function refresh(id: string) {
  revalidatePath(`/trips/${id}`);
  revalidatePath(`/trips/${id}/manage`);
  revalidatePath(`/trips/${id}/entry`);
  revalidatePath("/dashboard");
}
export async function createTripAction(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    const starts = f.getAll("start"),
      ends = f.getAll("end"),
      startOffsets = f.getAll("startOffset"),
      endOffsets = f.getAll("endOffset");
    const result = await createTrip(await plannerToken(), {
      title: value(f, "title"),
      description: value(f, "description"),
      timezone: value(f, "timezone"),
      mode: value(f, "mode"),
      contributionsEnabled: f.get("contributionsEnabled") === "on",
      members: value(f, "members")
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
      destinations: value(f, "destinations")
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
      dates: starts.map((s, i) => ({
        start: String(s),
        end: String(ends[i] || ""),
        startOffset: String(startOffsets[i] || ""),
        endOffset: String(endOffsets[i] || ""),
      })),
      contributions: value(f, "contributions")
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
    });
    refresh(result.trip.id);
    return {
      message: "Your trip is ready. Save this code now; it is shown only once.",
      code: result.code,
      tripId: result.trip.id,
    };
  } catch (e) {
    return actionError(e);
  }
}
export async function manageAction(
  id: string,
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    const token = await plannerToken();
    switch (value(f, "operation")) {
      case "settled":
        await editTrip(token, id, {
          destinationId: value(f, "destinationId"),
          dateId: value(f, "dateId"),
        });
        break;
      case "details":
        await editTrip(token, id, {
          title: value(f, "title"),
          description: value(f, "description"),
          timezone: value(f, "timezone"),
        });
        break;
      case "contributions":
        await editTrip(token, id, {
          contributionsEnabled: f.get("contributionsEnabled") === "on",
          contributionId: value(f, "contributionId"),
        });
        break;
      case "rotate": {
        const code = await rotateCode(token, id);
        refresh(id);
        return {
          message:
            "Old codes and visitor access have been revoked. Save your new code.",
          code,
          tripId: id,
        };
      }
      case "member": {
        const op = value(f, "memberOperation");
        if (!["add", "rename", "delete", "reset"].includes(op))
          throw new Error("Invalid member operation");
        await mutateMember(
          token,
          id,
          op as "add" | "rename" | "delete" | "reset",
          { id: value(f, "memberId"), name: value(f, "name") },
        );
        break;
      }
      case "option": {
        const op = value(f, "optionOperation");
        if (!["add", "edit", "delete"].includes(op))
          throw new Error("Invalid option operation");
        await mutateOption(
          token,
          id,
          value(f, "category"),
          op as "add" | "edit" | "delete",
          {
            id: value(f, "optionId"),
            name: value(f, "name"),
            amount: value(f, "amount"),
            start: value(f, "start"),
            end: value(f, "end"),
            startOffset: value(f, "startOffset"),
            endOffset: value(f, "endOffset"),
          },
        );
        break;
      }
      case "payment":
        await setPayment(token, id, value(f, "memberId"), value(f, "amount"));
        break;
      case "finalize":
        await finalizeTrip(token, id, {
          destination: value(f, "destination") || undefined,
          date: value(f, "date") || undefined,
          contribution: value(f, "contribution") || undefined,
        });
        break;
      default:
        throw new Error("Invalid operation");
    }
    refresh(id);
    return { message: "Saved." };
  } catch (e) {
    return actionError(e);
  }
}
export async function voteAction(
  id: string,
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    await castVote(
      await identity(id),
      id,
      value(f, "category"),
      value(f, "optionId"),
    );
    refresh(id);
    return { message: "Vote saved. You can change it while planning is open." };
  } catch (e) {
    return actionError(e);
  }
}
