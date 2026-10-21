import "server-only";
import { asc, count, eq, inArray } from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import { applications, contacts, type NewContactRow } from "@/server/db/schema";

export type ContactFields = Omit<
  NewContactRow,
  "id" | "createdAt" | "updatedAt"
>;

export async function insertContact(tx: Executor, values: ContactFields) {
  const [row] = await tx.insert(contacts).values(values).returning();
  return row;
}

export async function updateContact(
  tx: Executor,
  id: string,
  values: ContactFields,
) {
  const [row] = await tx
    .update(contacts)
    .set(values)
    .where(eq(contacts.id, id))
    .returning();
  return row;
}

export async function deleteContact(tx: Executor, id: string) {
  const [row] = await tx
    .delete(contacts)
    .where(eq(contacts.id, id))
    .returning();
  return row;
}

export async function findContact(tx: Executor, id: string) {
  const [row] = await tx.select().from(contacts).where(eq(contacts.id, id));
  return row;
}

export async function listContacts(tx: Executor) {
  const usage = tx
    .select({ contactId: applications.contactId, uses: count().as("uses") })
    .from(applications)
    .groupBy(applications.contactId)
    .as("usage");
  return tx
    .select({ contact: contacts, applicationCount: usage.uses })
    .from(contacts)
    .leftJoin(usage, eq(usage.contactId, contacts.id))
    .orderBy(asc(contacts.name));
}

export async function findContacts(tx: Executor, ids: string[]) {
  if (ids.length === 0) return [];
  return tx.select().from(contacts).where(inArray(contacts.id, ids));
}
