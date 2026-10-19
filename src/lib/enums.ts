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

/** Where a step came from: entered by hand, or detected in an email (v2). */
export const STEP_SOURCES = ["manual", "gmail"] as const;
export type StepSource = (typeof STEP_SOURCES)[number];

export const FILE_KINDS = ["resume", "attachment"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

/** A step either happened, is planned (upcoming), or was cancelled. */
export const STEP_STATES = ["done", "planned", "cancelled"] as const;
export type StepState = (typeof STEP_STATES)[number];
