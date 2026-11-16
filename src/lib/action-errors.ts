import "server-only";
import { ZodError } from "zod";
import { postgresState } from "./db-errors";
import { UserError } from "./validation";
import type { FormState } from "./form-state";
export function actionError(error: unknown): FormState {
  if (error instanceof UserError)
    return {
      errors: { [error.field]: [error.message] },
      message: error.message,
    };
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] || "form");
      (errors[field] ??= []).push(issue.message);
    }
    return { errors, message: "Please check the highlighted fields." };
  }
  if (
    postgresState(error) === "23505"
  )
    return {
      errors: { form: ["That name, account, or option already exists."] },
      message: "That name, account, or option already exists.",
    };
  // Do not log Prisma errors: query metadata can contain sensitive values.
  console.error(
    "Trip Lang operation failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return {
    errors: { form: ["Something went wrong. Please try again."] },
    message: "Something went wrong. Please try again.",
  };
}
