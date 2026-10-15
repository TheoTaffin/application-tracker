import "server-only";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import { applicationStages, type StageRow } from "@/server/db/schema";
import type { StageState } from "@/lib/enums";

export interface StageFields {
  name: string;
  state: StageState;
  date: string | null;
  note: string | null;
}

export async function listStages(
  tx: Executor,
  applicationIds: string[],
): Promise<StageRow[]> {
  if (applicationIds.length === 0) return [];
  return tx
    .select()
    .from(applicationStages)
    .where(inArray(applicationStages.applicationId, applicationIds))
    .orderBy(
      asc(applicationStages.applicationId),
      asc(applicationStages.position),
    );
}

export async function findStage(tx: Executor, id: string) {
  const [row] = await tx
    .select()
    .from(applicationStages)
    .where(eq(applicationStages.id, id));
  return row as StageRow | undefined;
}

/** Appends at the end of the application's stages. */
export async function insertStage(
  tx: Executor,
  applicationId: string,
  fields: StageFields,
) {
  const [{ last }] = await tx
    .select({ last: max(applicationStages.position) })
    .from(applicationStages)
    .where(eq(applicationStages.applicationId, applicationId));
  const [row] = await tx
    .insert(applicationStages)
    .values({ applicationId, position: (last ?? -1) + 1, ...fields })
    .returning();
  return row;
}

export async function updateStage(
  tx: Executor,
  id: string,
  fields: Partial<StageFields & { position: number }>,
) {
  const [row] = await tx
    .update(applicationStages)
    .set(fields)
    .where(eq(applicationStages.id, id))
    .returning();
  return row as StageRow | undefined;
}

export async function deleteStage(tx: Executor, id: string) {
  const [row] = await tx
    .delete(applicationStages)
    .where(eq(applicationStages.id, id))
    .returning();
  return row as StageRow | undefined;
}

/** Other stages of the same application currently in the given state. */
export async function stagesInState(
  tx: Executor,
  applicationId: string,
  state: StageState,
) {
  return tx
    .select()
    .from(applicationStages)
    .where(
      and(
        eq(applicationStages.applicationId, applicationId),
        eq(applicationStages.state, state),
      ),
    );
}
