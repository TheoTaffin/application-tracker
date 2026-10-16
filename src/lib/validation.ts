import { z } from "zod";
import { APPLICATION_SOURCES, POSTING_LANGUAGES, STAGE_STATES } from "./enums";
import { APPLICATION_STATUSES } from "./status";

/**
 * Input schemas, shared by server actions (authoritative) and UI forms (early feedback).
 * Inputs may come from FormData, so empty strings mean "no value" and numbers or
 * booleans may arrive as strings.
 */

const emptyToNull = (v: unknown) =>
  v === undefined || (typeof v === "string" && v.trim() === "") ? null : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

const requiredText = (max: number) =>
  z.string().trim().min(1, "Required").max(max);

const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => {
    const value = emptyToNull(v);
    return value === null ? null : Number(value);
  }, z.number().int().min(min).max(max).nullable());

const httpUrl = z
  .url({ protocol: /^https?$/, normalize: true })
  .max(2048, "URL is too long");

const optionalUrl = z.preprocess(emptyToNull, httpUrl.nullable());
const optionalUuid = z.preprocess(emptyToNull, z.uuid().nullable());
const optionalDate = z.preprocess(emptyToNull, z.iso.date().nullable());
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToNull, z.enum(values).nullable());

const checkbox = z.preprocess(
  (v) => v === true || v === "true" || v === "on" || v === "1",
  z.boolean(),
);

export const contactInput = z.object({
  name: requiredText(200),
  email: z.preprocess(emptyToNull, z.email().max(320).nullable()),
  phone: optionalText(50),
  company: optionalText(200),
  role: optionalText(200),
  linkedinUrl: optionalUrl,
  notes: optionalText(10_000),
});
export type ContactInput = z.infer<typeof contactInput>;

/** Fields the user edits on an application (create and update). */
export const applicationInput = z
  .object({
    company: requiredText(200),
    role: requiredText(300),
    description: optionalText(20_000),
    offerUrl: optionalUrl,
    offerSnapshot: optionalText(200_000),
    location: optionalText(200),
    workloadMin: optionalInt(0, 100),
    workloadMax: optionalInt(0, 100),
    salaryAsk: optionalInt(1, 10_000_000),
    language: optionalEnum(POSTING_LANGUAGES),
    source: optionalEnum(APPLICATION_SOURCES),
    viaAgency: checkbox,
    formAnswers: optionalText(50_000),
    resumeId: optionalUuid,
    contactId: optionalUuid,
    appliedAt: optionalDate,
    nextActionAt: optionalDate,
    nextActionNote: optionalText(1_000),
  })
  .refine(
    (a) =>
      a.workloadMin === null ||
      a.workloadMax === null ||
      a.workloadMin <= a.workloadMax,
    {
      message: "Minimum workload must not exceed the maximum",
      path: ["workloadMax"],
    },
  );
export type ApplicationInput = z.infer<typeof applicationInput>;

/** Extractor output sent back by the form; stored for traceability, so bounded. */
export const extractedOfferInput = z
  .object({
    company: z.string().max(200),
    role: z.string().max(300),
    location: z.string().max(200),
    description: z.string().max(50_000),
    workloadMin: z.number().int().min(0).max(100),
    workloadMax: z.number().int().min(0).max(100),
    salaryMin: z.number().nonnegative(),
    salaryMax: z.number().nonnegative(),
    salaryCurrency: z.string().max(10),
    salaryPeriod: z.string().max(20),
    employmentType: z.string().max(100),
    datePosted: z.string().max(40),
    language: z.enum(POSTING_LANGUAGES),
    source: z.enum(APPLICATION_SOURCES),
  })
  .partial()
  .strip();

export const newApplicationInput = z.object({
  application: applicationInput,
  extracted: extractedOfferInput.nullish(),
  initialStatus: z.enum(APPLICATION_STATUSES).default("applied"),
  /** Create a contact inline instead of picking an existing one. */
  newContact: contactInput.nullish(),
});
export type NewApplicationInput = z.input<typeof newApplicationInput>;

export const statusUpdateInput = z.object({
  status: z.enum(APPLICATION_STATUSES),
  note: optionalText(5_000),
  /** When it happened; defaults to now. Accepts a date or a datetime with offset. */
  occurredAt: z.preprocess(
    emptyToNull,
    z.union([z.iso.datetime({ offset: true }), z.iso.date()]).nullable(),
  ),
  /** Optionally switch the application's contact at the same time. */
  contactId: optionalUuid.optional(),
});
export type StatusUpdateInput = z.infer<typeof statusUpdateInput>;

export const fileLabelInput = z.object({ label: requiredText(200) });

export const extractOfferInput = z.object({ url: httpUrl });

export const idInput = z.uuid();

export const stageInput = z.object({
  name: requiredText(200),
  state: z.enum(STAGE_STATES).default("planned"),
  date: optionalDate,
  note: optionalText(2_000),
});
export type StageInput = z.infer<typeof stageInput>;

export const stageMoveInput = z.enum(["up", "down"]);

export const noteInput = z.object({ body: requiredText(5_000) });
