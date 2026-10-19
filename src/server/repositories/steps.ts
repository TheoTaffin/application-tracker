import "server-only";
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import { applicationSteps, type StepRow } from "@/server/db/schema";
import type { StepInput } from "@/lib/validation";

/** Steps of several applications, in chronological order (see lib/steps). */
export async function listSteps(
  tx: Executor,
  applicationIds: string[],
): Promise<StepRow[]> {
  if (applicationIds.length === 0) return [];
  return tx
    .select()
    .from(applicationSteps)
    .where(inArray(applicationSteps.applicationId, applicationIds))
    .orderBy(
      asc(applicationSteps.applicationId),
      asc(applicationSteps.date),
      asc(applicationSteps.createdAt),
    );
}

export async function insertSteps(
  tx: Executor,
  applicationId: string,
  steps: StepInput[],
) {
  if (steps.length === 0) return [];
  return tx
    .insert(applicationSteps)
    .values(steps.map((s) => ({ ...s, applicationId })))
    .returning();
}

export async function findStep(tx: Executor, id: string) {
  const [row] = await tx
    .select()
    .from(applicationSteps)
    .where(eq(applicationSteps.id, id));
  return row as StepRow | undefined;
}

export async function updateStep(tx: Executor, id: string, fields: StepInput) {
  const [row] = await tx
    .update(applicationSteps)
    .set(fields)
    .where(eq(applicationSteps.id, id))
    .returning();
  return row as StepRow | undefined;
}

export async function deleteStep(tx: Executor, id: string) {
  const [row] = await tx
    .delete(applicationSteps)
    .where(eq(applicationSteps.id, id))
    .returning();
  return row as StepRow | undefined;
}

/** Done steps of an application other than `exceptId`. */
export async function countOtherDoneSteps(
  tx: Executor,
  applicationId: string,
  exceptId: string,
) {
  const [row] = await tx
    .select({ n: count() })
    .from(applicationSteps)
    .where(
      and(
        eq(applicationSteps.applicationId, applicationId),
        eq(applicationSteps.state, "done"),
        ne(applicationSteps.id, exceptId),
      ),
    );
  return row.n;
}
