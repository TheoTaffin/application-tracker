import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  APPLICATION_SOURCES,
  FILE_KINDS,
  POSTING_LANGUAGES,
  STATUS_EVENT_SOURCES,
} from "../../lib/enums";
import { APPLICATION_STATUSES } from "../../lib/status";
import type { ExtractedOffer } from "../extraction/types";

// Column names are mapped to snake_case by the `casing` option (client + drizzle.config).

export const applicationStatus = pgEnum(
  "application_status",
  APPLICATION_STATUSES,
);
export const statusEventSource = pgEnum(
  "status_event_source",
  STATUS_EVENT_SOURCES,
);
export const postingLanguage = pgEnum("posting_language", POSTING_LANGUAGES);
export const applicationSource = pgEnum(
  "application_source",
  APPLICATION_SOURCES,
);
export const fileKind = pgEnum("file_kind", FILE_KINDS);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const contacts = pgTable("contacts", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text(),
  phone: text(),
  company: text(),
  role: text(),
  linkedinUrl: text(),
  notes: text(),
  ...timestamps,
});

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    company: text().notNull(),
    role: text().notNull(),
    description: text(),
    offerUrl: text(),
    /** Plain-text copy of the posting, kept because postings disappear. */
    offerSnapshot: text(),
    /** Raw extractor output, kept for traceability and later re-processing. */
    offerExtracted: jsonb().$type<ExtractedOffer>(),
    location: text(),
    workloadMin: smallint(),
    workloadMax: smallint(),
    /** Yearly salary I asked for, in CHF. */
    salaryAsk: integer(),
    language: postingLanguage(),
    source: applicationSource(),
    viaAgency: boolean().default(false).notNull(),
    /** What I answered in the application form (markdown). */
    formAnswers: text(),
    resumeId: uuid().references((): AnyPgColumn => files.id, {
      onDelete: "set null",
    }),
    contactId: uuid().references(() => contacts.id, { onDelete: "set null" }),
    appliedAt: date({ mode: "string" }),
    nextActionAt: date({ mode: "string" }),
    nextActionNote: text(),
    ...timestamps,
  },
  (t) => [
    index().on(t.nextActionAt),
    index().on(t.contactId),
    index().on(t.resumeId),
    check(
      "applications_workload_range",
      sql`(${t.workloadMin} IS NULL OR ${t.workloadMin} BETWEEN 0 AND 100)
        AND (${t.workloadMax} IS NULL OR ${t.workloadMax} BETWEEN 0 AND 100)
        AND (${t.workloadMin} IS NULL OR ${t.workloadMax} IS NULL OR ${t.workloadMin} <= ${t.workloadMax})`,
    ),
    check(
      "applications_salary_ask_positive",
      sql`${t.salaryAsk} IS NULL OR ${t.salaryAsk} > 0`,
    ),
  ],
);

export const statusEvents = pgTable(
  "status_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    status: applicationStatus().notNull(),
    note: text(),
    occurredAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    source: statusEventSource().default("manual").notNull(),
    /** Set when the event came from an email, so a message is never applied twice. */
    gmailMessageId: text().unique(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.applicationId, t.occurredAt.desc(), t.createdAt.desc())],
);

export const files = pgTable(
  "files",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: fileKind().notNull(),
    label: text().notNull(),
    originalName: text().notNull(),
    mime: text().notNull(),
    size: integer().notNull(),
    /** Random object key; never derived from user input. */
    storageKey: text().notNull().unique(),
    applicationId: uuid().references((): AnyPgColumn => applications.id, {
      onDelete: "cascade",
    }),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index().on(t.applicationId),
    // Resumes live in the shared library; attachments always belong to one application.
    check(
      "files_kind_matches_owner",
      sql`(${t.kind} = 'resume' AND ${t.applicationId} IS NULL)
        OR (${t.kind} = 'attachment' AND ${t.applicationId} IS NOT NULL)`,
    ),
    check("files_size_positive", sql`${t.size} > 0`),
  ],
);

export type ApplicationRow = typeof applications.$inferSelect;
export type NewApplicationRow = typeof applications.$inferInsert;
export type StatusEventRow = typeof statusEvents.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;
export type FileRow = typeof files.$inferSelect;
