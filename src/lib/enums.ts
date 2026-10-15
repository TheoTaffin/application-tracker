/** Enumerations shared by the database schema, validation and UI. */

export const POSTING_LANGUAGES = ["de", "fr", "en", "it"] as const;
export type PostingLanguage = (typeof POSTING_LANGUAGES)[number];

export const APPLICATION_SOURCES = [
  "jobs_ch",
  "jobup_ch",
  "linkedin",
  "company_site",
  "referral",
  "recruiter",
  "other",
] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const STATUS_EVENT_SOURCES = ["manual", "gmail"] as const;
export type StatusEventSource = (typeof STATUS_EVENT_SOURCES)[number];

export const FILE_KINDS = ["resume", "attachment"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

/** State of a custom, user-named stage in an application's process. */
export const STAGE_STATES = [
  "planned",
  "active",
  "passed",
  "failed",
  "cancelled",
] as const;
export type StageState = (typeof STAGE_STATES)[number];
