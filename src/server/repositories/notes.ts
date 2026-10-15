import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import { applicationNotes, type NoteRow } from "@/server/db/schema";

export async function listNotes(
  tx: Executor,
  applicationIds: string[],
): Promise<NoteRow[]> {
  if (applicationIds.length === 0) return [];
  return tx
    .select()
    .from(applicationNotes)
    .where(inArray(applicationNotes.applicationId, applicationIds))
    .orderBy(
      asc(applicationNotes.applicationId),
      desc(applicationNotes.createdAt),
    );
}

export async function insertNote(
  tx: Executor,
  applicationId: string,
  body: string,
) {
  const [row] = await tx
    .insert(applicationNotes)
    .values({ applicationId, body })
    .returning();
  return row;
}

export async function updateNote(tx: Executor, id: string, body: string) {
  const [row] = await tx
    .update(applicationNotes)
    .set({ body })
    .where(eq(applicationNotes.id, id))
    .returning();
  return row as NoteRow | undefined;
}

export async function deleteNote(tx: Executor, id: string) {
  const [row] = await tx
    .delete(applicationNotes)
    .where(eq(applicationNotes.id, id))
    .returning();
  return row as NoteRow | undefined;
}
