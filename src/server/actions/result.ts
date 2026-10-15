import "server-only";
import { refresh } from "next/cache";
import { FetchFailedError, UnsafeUrlError } from "@/server/extraction";
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
} from "@/server/services/errors";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Run a service call for a server action: expected errors become a typed result the
 * UI can render, unexpected ones are logged and reported generically (no internals
 * leak to the browser). Mutations refresh the router so pages show the new state.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
  { mutates = true }: { mutates?: boolean } = {},
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    if (mutates) refresh();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    }
    if (
      err instanceof NotFoundError ||
      err instanceof ConflictError ||
      err instanceof UnsafeUrlError ||
      err instanceof FetchFailedError
    ) {
      return { ok: false, error: err.message };
    }
    console.error("Server action failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Read a JSON `payload` field from FormData (used when a form also carries files). */
export function jsonPayload(formData: FormData): unknown {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new InvalidInputError("Missing payload");
  try {
    return JSON.parse(raw);
  } catch {
    throw new InvalidInputError("Malformed payload");
  }
}

/** Non-empty files under `name` (browsers send an empty file for an untouched input). */
export function filesFrom(formData: FormData, name: string): File[] {
  return formData
    .getAll(name)
    .filter((v): v is File => v instanceof File && v.size > 0);
}
