import "server-only";
import { z } from "zod";

/** Domain errors raised by services; server actions turn them into ActionResults. */

export class NotFoundError extends Error {
  override name = "NotFoundError";
  constructor(what: string) {
    super(`${what} not found`);
  }
}

export class ConflictError extends Error {
  override name = "ConflictError";
}

export class InvalidInputError extends Error {
  override name = "InvalidInputError";
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Field errors are keyed by dotted path (e.g. "application.company") to match the input. */
  static fromZod(error: z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    let formError: string | undefined;
    for (const issue of error.issues) {
      if (issue.path.length === 0) {
        formError ??= issue.message;
        continue;
      }
      const key = issue.path.map(String).join(".");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return new InvalidInputError(
      formError ?? "Please check the highlighted fields",
      fieldErrors,
    );
  }
}

/** Parse with a zod schema, throwing InvalidInputError on failure. */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw InvalidInputError.fromZod(result.error);
  return result.data;
}
