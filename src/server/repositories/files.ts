import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import { applications, files, type FileRow } from "@/server/db/schema";
import type { FileKind } from "@/lib/enums";

export interface NewFile {
  kind: FileKind;
  label: string;
  originalName: string;
  mime: string;
  size: number;
  storageKey: string;
  applicationId: string | null;
}

export async function insertFile(
  tx: Executor,
  file: NewFile,
): Promise<FileRow> {
  const [row] = await tx.insert(files).values(file).returning();
  return row;
}

export async function findFile(
  tx: Executor,
  id: string,
): Promise<FileRow | undefined> {
  const [row] = await tx.select().from(files).where(eq(files.id, id));
  return row;
}

export async function listResumes(tx: Executor) {
  const usage = tx
    .select({ resumeId: applications.resumeId, uses: count().as("uses") })
    .from(applications)
    .groupBy(applications.resumeId)
    .as("usage");
  return tx
    .select({ file: files, uses: usage.uses })
    .from(files)
    .leftJoin(usage, eq(usage.resumeId, files.id))
    .where(eq(files.kind, "resume"))
    .orderBy(desc(files.uploadedAt));
}

export async function listAttachments(tx: Executor, applicationId: string) {
  return tx
    .select()
    .from(files)
    .where(
      and(eq(files.kind, "attachment"), eq(files.applicationId, applicationId)),
    )
    .orderBy(desc(files.uploadedAt));
}

export async function countResumeUses(
  tx: Executor,
  resumeId: string,
): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(applications)
    .where(eq(applications.resumeId, resumeId));
  return row.n;
}

export async function renameFile(tx: Executor, id: string, label: string) {
  const [row] = await tx
    .update(files)
    .set({ label })
    .where(eq(files.id, id))
    .returning();
  return row as FileRow | undefined;
}

export async function deleteFile(tx: Executor, id: string) {
  const [row] = await tx.delete(files).where(eq(files.id, id)).returning();
  return row as FileRow | undefined;
}

export async function findFiles(
  tx: Executor,
  ids: string[],
): Promise<FileRow[]> {
  if (ids.length === 0) return [];
  return tx.select().from(files).where(inArray(files.id, ids));
}

export async function listAttachmentsFor(
  tx: Executor,
  applicationIds: string[],
): Promise<FileRow[]> {
  if (applicationIds.length === 0) return [];
  return tx
    .select()
    .from(files)
    .where(
      and(
        eq(files.kind, "attachment"),
        inArray(files.applicationId, applicationIds),
      ),
    )
    .orderBy(desc(files.uploadedAt));
}
