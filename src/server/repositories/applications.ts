import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import {
  applications,
  contacts,
  type ApplicationRow,
  type NewApplicationRow,
} from "@/server/db/schema";

export type ApplicationFields = Omit<
  NewApplicationRow,
  "id" | "createdAt" | "updatedAt"
>;

export async function insertApplication(
  tx: Executor,
  values: ApplicationFields,
) {
  const [row] = await tx.insert(applications).values(values).returning();
  return row;
}

export async function updateApplication(
  tx: Executor,
  id: string,
  values: Partial<ApplicationFields>,
) {
  const [row] = await tx
    .update(applications)
    .set(values)
    .where(eq(applications.id, id))
    .returning();
  return row as ApplicationRow | undefined;
}

export async function deleteApplication(tx: Executor, id: string) {
  const [row] = await tx
    .delete(applications)
    .where(eq(applications.id, id))
    .returning();
  return row as ApplicationRow | undefined;
}

export async function findApplication(tx: Executor, id: string) {
  const [row] = await tx
    .select()
    .from(applications)
    .where(eq(applications.id, id));
  return row as ApplicationRow | undefined;
}

/** Every application with its contact's name, most recently updated first. */
export async function listApplicationRows(tx: Executor) {
  return tx
    .select({ application: applications, contactName: contacts.name })
    .from(applications)
    .leftJoin(contacts, eq(contacts.id, applications.contactId))
    .orderBy(desc(applications.updatedAt));
}
