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
  STEP_SOURCES,
  STEP_STATES,
} from "../../lib/enums";
import { APPLICATION_STATUSES } from "../../lib/status";
import type { ExtractedOffer } from "../extraction/types";

// Column names are mapped to snake_case by the `casing` option (client + drizzle.config).

export const applicationStatus = pgEnum(
  "application_status",
  APPLICATION_STATUSES,
);
export const stepSource = pgEnum("step_source", STEP_SOURCES);
export const stepState = pgEnum("step_state", STEP_STATES);
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
    offerUrl: text(),
    /** The posting's text (extracted or pasted), kept because postings disappear. */
    jobDescription: text(),
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
    ...timestamps,
  },
  (t) => [
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

/**
 * The application's timeline: what happened (done) and what is coming (planned).
 * Each step carries a status, which drives the Pending / On-going / Closed groups,
 * and an optional name of its own ("Technical round with Lukas").
 *
 * Derived, never stored: the current status is the latest done step, the next action
 * is the earliest planned step, the applied date is the first "applied" step.
 */
export const applicationSteps = pgTable(
  "application_steps",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    status: applicationStatus().notNull(),
    title: text(),
    state: stepState().default("done").notNull(),
    /** When it happened, or when it is planned (optional for planned steps). */
    date: date({ mode: "string" }),
    note: text(),
    source: stepSource().default("manual").notNull(),
    /** Set when the step came from an email, so a message is never applied twice. */
    gmailMessageId: text().unique(),
    ...timestamps,
  },
  (t) => [
    index().on(t.applicationId, t.date),
    check(
      "application_steps_done_has_date",
      sql`${t.state} <> 'done' OR ${t.date} IS NOT NULL`,
    ),
  ],
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

/** Free-form dated notes, separate from the steps. */
export const applicationNotes = pgTable(
  "application_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    body: text().notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.applicationId, t.createdAt.desc())],
);

export type ApplicationRow = typeof applications.$inferSelect;
export type NewApplicationRow = typeof applications.$inferInsert;
export type StepRow = typeof applicationSteps.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;
export type FileRow = typeof files.$inferSelect;
export type NoteRow = typeof applicationNotes.$inferSelect;
