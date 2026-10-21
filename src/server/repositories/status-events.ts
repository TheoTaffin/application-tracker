import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Executor } from "@/server/db/client";
import { statusEvents } from "@/server/db/schema";
import type { ApplicationStatus } from "@/lib/status";
import type { StatusEventSource } from "@/lib/enums";

export interface NewStatusEvent {
  applicationId: string;
  status: ApplicationStatus;
  note?: string | null;
  occurredAt?: Date;
  source?: StatusEventSource;
  gmailMessageId?: string | null;
}

export async function insertStatusEvent(tx: Executor, event: NewStatusEvent) {
  const [row] = await tx.insert(statusEvents).values(event).returning();
  return row;
}

export async function listStatusEvents(tx: Executor, applicationId: string) {
  return tx
    .select()
    .from(statusEvents)
    .where(eq(statusEvents.applicationId, applicationId))
    .orderBy(desc(statusEvents.occurredAt), desc(statusEvents.createdAt));
}

/**
 * Latest event per application: the current status. Ties on occurred_at are broken by
 * insertion time, so the most recently recorded update wins.
 */
export function latestStatusSubquery(tx: Executor) {
  return tx
    .selectDistinctOn([statusEvents.applicationId], {
      applicationId: statusEvents.applicationId,
      status: statusEvents.status,
      occurredAt: statusEvents.occurredAt,
    })
    .from(statusEvents)
    .orderBy(
      statusEvents.applicationId,
      desc(statusEvents.occurredAt),
      desc(statusEvents.createdAt),
    )
    .as("latest_status");
}
