import { z } from "zod";
import { APPLICATION_SOURCES, POSTING_LANGUAGES, STEP_STATES } from "./enums";
import { setsStatus, STEP_KINDS } from "./steps";

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
    offerUrl: optionalUrl,
    jobDescription: optionalText(200_000),
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

/** One step of the timeline: something that happened (done) or is coming (planned). */
export const stepInput = z
  .object({
    /** A status change (applied, interview_1…) or an action (reach_out). */
    kind: z.enum(STEP_KINDS),
    /** Optional name of its own, e.g. "Technical round with Lukas". */
    title: optionalText(200),
    state: z.enum(STEP_STATES).default("done"),
    date: optionalDate,
    note: optionalText(5_000),
  })
  .refine((s) => s.state !== "done" || s.date !== null, {
    message: "When did it happen?",
    path: ["date"],
  });
export type StepInput = z.infer<typeof stepInput>;

export const newApplicationInput = z.object({
  application: applicationInput,
  extracted: extractedOfferInput.nullish(),
  /** The steps so far (at least one done), and any already planned. */
  steps: z
    .array(stepInput)
    .min(1)
    .max(50)
    .refine((steps) => steps.some(setsStatus), {
      message:
        "Add at least one status change that already happened (e.g. Applied)",
    }),
  /** First entry of the notes log. */
  note: optionalText(5_000),
});
export type NewApplicationInput = z.input<typeof newApplicationInput>;

export const fileLabelInput = z.object({ label: requiredText(200) });

export const extractOfferInput = z.object({ url: httpUrl });

export const idInput = z.uuid();

export const noteInput = z.object({ body: requiredText(5_000) });
