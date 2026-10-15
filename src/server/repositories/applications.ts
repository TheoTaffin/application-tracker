import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import {
  applications,
  contacts,
  type ApplicationRow,
  type NewApplicationRow,
} from "@/server/db/schema";
import type { ApplicationStatus } from "@/lib/status";
import { latestStatusSubquery } from "./status-events";

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

export interface ListFilters {
  statuses?: ApplicationStatus[];
  search?: string;
  /** Only applications whose next action is due on or before this date (YYYY-MM-DD). */
  dueBy?: string;
  sort?: "updated" | "applied" | "company" | "next_action";
}

/** Escape LIKE wildcards so user input is matched literally. */
const likePattern = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listApplications(
  tx: Executor,
  filters: ListFilters = {},
) {
  const latest = latestStatusSubquery(tx);
  const where: SQL[] = [];
  if (filters.statuses?.length)
    where.push(inArray(latest.status, filters.statuses));
  if (filters.search) {
    const pattern = likePattern(filters.search);
    where.push(
      or(
        ilike(applications.company, pattern),
        ilike(applications.role, pattern),
      )!,
    );
  }
  if (filters.dueBy) {
    where.push(
      isNotNull(applications.nextActionAt),
      lte(applications.nextActionAt, filters.dueBy),
    );
  }
  const orderBy = {
    updated: [desc(applications.updatedAt)],
    applied: [desc(applications.appliedAt), desc(applications.createdAt)],
    company: [asc(applications.company), asc(applications.role)],
    next_action: [asc(applications.nextActionAt), asc(applications.company)],
  }[filters.sort ?? "updated"];

  return tx
    .select({
      application: applications,
      status: latest.status,
      statusAt: latest.occurredAt,
      contactName: contacts.name,
    })
    .from(applications)
    .innerJoin(latest, eq(latest.applicationId, applications.id))
    .leftJoin(contacts, eq(contacts.id, applications.contactId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(...orderBy);
}
