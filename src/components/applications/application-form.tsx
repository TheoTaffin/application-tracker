"use client";

import { Check, Loader2, Plus, Sparkles, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Checkbox,
  Field,
  FormError,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { APPLICATION_SOURCES, POSTING_LANGUAGES } from "@/lib/enums";
import { LANGUAGE_LABEL, SOURCE_LABEL } from "@/lib/format";
import {
  createApplicationAction,
  extractOfferAction,
  updateApplicationAction,
} from "@/server/actions/applications";
import { createContactAction } from "@/server/actions/contacts";
import { uploadResumeAction } from "@/server/actions/files";
import type {
  ExtractedOffer,
  ExtractionResult,
} from "@/server/extraction/types";
import type { FormOptions } from "@/server/services/application-service";
import { emptyStep, StepFields, type StepValues } from "./step-fields";
import {
  contactErrors,
  ContactFields,
  contactValues,
  type ContactValues,
} from "@/components/contacts/contact-fields";

export interface ApplicationValues {
  offerUrl: string;
  company: string;
  role: string;
  location: string;
  workloadMin: string;
  workloadMax: string;
  salaryAsk: string;
  language: string;
  source: string;
  viaAgency: boolean;
  formAnswers: string;
  /** The posting's text: extracted from the link, or pasted. */
  jobDescription: string;
  resumeId: string;
  contactId: string;
}

const NEW = "__new__";

export function emptyValues(): ApplicationValues {
  return {
    offerUrl: "",
    company: "",
    role: "",
    location: "",
    workloadMin: "",
    workloadMax: "",
    salaryAsk: "",
    language: "",
    source: "",
    viaAgency: false,
    formAnswers: "",
    jobDescription: "",
    resumeId: "",
    contactId: "",
  };
}

/** Extracted fields only fill what the user has not typed (or pasted) yet. */
function mergeExtracted(
  values: ApplicationValues,
  fields: ExtractedOffer,
): ApplicationValues {
  const fill = (current: string, next: string | number | undefined) =>
    current || next === undefined ? current : String(next);
  return {
    ...values,
    company: fill(values.company, fields.company),
    role: fill(values.role, fields.role),
    location: fill(values.location, fields.location),
    workloadMin: fill(values.workloadMin, fields.workloadMin),
    workloadMax: fill(values.workloadMax, fields.workloadMax),
    language: fill(values.language, fields.language),
    source: fill(values.source, fields.source),
    jobDescription: fill(values.jobDescription, fields.description),
  };
}

type FieldErrors = Record<string, string[]>;

export function ApplicationForm({
  mode,
  applicationId,
  initialValues,
  options,
  autoExtractUrl,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  applicationId?: string;
  initialValues?: ApplicationValues;
  options: FormOptions;
  /** Prefill the URL and fetch the offer right away (bookmarklet). */
  autoExtractUrl?: string;
  onDone: (id: string) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ApplicationValues>(
    () => initialValues ?? { ...emptyValues(), offerUrl: autoExtractUrl ?? "" },
  );
  // Create mode: the steps so far (e.g. applied, then acknowledged) and a first note.
  const [steps, setSteps] = useState<StepValues[]>(() => [
    emptyStep("applied"),
  ]);
  const [note, setNote] = useState("");
  const [newContact, setNewContact] = useState<ContactValues>(() =>
    contactValues(),
  );
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [extracting, startExtract] = useTransition();
  const [saving, startSave] = useTransition();

  const set = <K extends keyof ApplicationValues>(
    key: K,
    value: ApplicationValues[K],
  ) => setValues((v) => ({ ...v, [key]: value }));
  const err = (key: string) =>
    fieldErrors[key] ?? fieldErrors[`application.${key}`];

  const extract = (url = values.offerUrl) => {
    if (!url) return;
    setExtractError(null);
    startExtract(async () => {
      const result = await extractOfferAction(url);
      if (!result.ok) {
        setExtractError(result.error);
        return;
      }
      setExtraction(result.data);
      // The structured description is cleaner than the whole-page text, which is
      // the fallback when the page has no structured data.
      const fields = {
        ...result.data.fields,
        description:
          result.data.fields.description ?? result.data.snapshot ?? undefined,
      };
      setValues((v) => ({ ...mergeExtracted(v, fields), offerUrl: url }));
    });
  };

  const autoExtracted = useRef(false);
  useEffect(() => {
    if (autoExtractUrl && !autoExtracted.current) {
      autoExtracted.current = true;
      extract(autoExtractUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the bookmarklet URL
  }, [autoExtractUrl]);

  const applicationFields = (overrides: Partial<ApplicationValues> = {}) => {
    const { resumeId, contactId, ...rest } = { ...values, ...overrides };
    return {
      ...rest,
      resumeId: resumeId === NEW ? "" : resumeId,
      contactId: contactId === NEW ? "" : contactId,
    };
  };

  const fail = (result: { error: string; fieldErrors?: FieldErrors }) => {
    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    startSave(async () => {
      if (mode === "create") {
        const formData = new FormData();
        formData.set(
          "payload",
          JSON.stringify({
            application: applicationFields(),
            steps,
            note,
            newContact: values.contactId === NEW ? newContact : null,
            extracted: extraction?.fields ?? null,
          }),
        );
        if (values.resumeId === NEW && resumeFile)
          formData.set("resumeFile", resumeFile);
        attachments.forEach((file) => formData.append("attachments", file));
        const result = await createApplicationAction(formData);
        if (!result.ok) return fail(result);
        onDone(result.data.id);
        return;
      }

      // Edit: create the new contact / resume first, then save the application.
      const overrides: Partial<ApplicationValues> = {};
      if (values.contactId === NEW) {
        const contact = await createContactAction(newContact);
        if (!contact.ok) return fail(contact);
        overrides.contactId = contact.data.id;
      }
      if (values.resumeId === NEW && resumeFile) {
        const formData = new FormData();
        formData.set("file", resumeFile);
        const resume = await uploadResumeAction(formData);
        if (!resume.ok) return fail(resume);
        overrides.resumeId = resume.data.id;
      }
      const result = await updateApplicationAction(
        applicationId!,
        applicationFields(overrides),
      );
      if (!result.ok) return fail(result);
      router.refresh();
      onDone(applicationId!);
    });
  };

  return (
    <form
      id="application-form"
      onSubmit={submit}
      className="flex flex-col gap-6"
      noValidate
    >
      <FormError message={error} />

      <section className="flex flex-col gap-3">
        <h3 className="eyebrow">Job offer</h3>
        <div className="flex items-end gap-2">
          <Field label="Offer URL" className="flex-1" error={err("offerUrl")}>
            {(p) => (
              <Input
                {...p}
                type="url"
                inputMode="url"
                placeholder="Paste a jobs.ch, jobup.ch, LinkedIn or company careers link"
                value={values.offerUrl}
                onChange={(e) => set("offerUrl", e.target.value)}
              />
            )}
          </Field>
          <Button
            onClick={() => extract()}
            disabled={!values.offerUrl || extracting}
          >
            {extracting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Fetch details
          </Button>
        </div>
        {extractError && (
          <p className="flex items-start gap-2 rounded border border-ochre-200 bg-ochre-50 px-3 py-2 text-xs text-ochre-800">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {extractError}
          </p>
        )}
        {extraction && (
          <div className="rounded border border-forest-200 bg-forest-50 px-3 py-2 text-xs text-forest-800">
            <p className="flex items-center gap-2">
              <Check className="size-3.5" />
              Prefilled from{" "}
              {extraction.extractors.join(", ") || "the page text"}. Please
              review.
            </p>
            {extraction.warnings.map((w) => (
              <p key={w} className="mt-1 text-ochre-800">
                {w}
              </p>
            ))}
          </div>
        )}
        <Field
          label="Job description"
          hint={
            values.jobDescription
              ? `${values.jobDescription.length.toLocaleString("de-CH")} characters, kept in case the posting disappears.`
              : "Fetched from the link above, or paste it here."
          }
          error={err("jobDescription")}
        >
          {(p) => (
            <Textarea
              {...p}
              rows={8}
              className="text-xs"
              value={values.jobDescription}
              onChange={(e) => set("jobDescription", e.target.value)}
            />
          )}
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <h3 className="eyebrow sm:col-span-2">Position</h3>
        <Field label="Company" error={err("company")}>
          {(p) => (
            <Input
              {...p}
              required
              value={values.company}
              onChange={(e) => set("company", e.target.value)}
            />
          )}
        </Field>
        <Field label="Role" error={err("role")}>
          {(p) => (
            <Input
              {...p}
              required
              value={values.role}
              onChange={(e) => set("role", e.target.value)}
            />
          )}
        </Field>
        <Field label="Location" error={err("location")}>
          {(p) => (
            <Input
              {...p}
              placeholder="Zürich, Lausanne…"
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Workload from %" error={err("workloadMin")}>
            {(p) => (
              <Input
                {...p}
                type="number"
                min={0}
                max={100}
                step={10}
                value={values.workloadMin}
                onChange={(e) => set("workloadMin", e.target.value)}
              />
            )}
          </Field>
          <Field label="to %" error={err("workloadMax")}>
            {(p) => (
              <Input
                {...p}
                type="number"
                min={0}
                max={100}
                step={10}
                value={values.workloadMax}
                onChange={(e) => set("workloadMax", e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Salary I asked for (CHF / year)" error={err("salaryAsk")}>
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0}
              step={1000}
              className="tabular"
              value={values.salaryAsk}
              onChange={(e) => set("salaryAsk", e.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Posting language" error={err("language")}>
            {(p) => (
              <Select
                {...p}
                value={values.language}
                onChange={(e) => set("language", e.target.value)}
              >
                <option value="">—</option>
                {POSTING_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_LABEL[l]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Source" error={err("source")}>
            {(p) => (
              <Select
                {...p}
                value={values.source}
                onChange={(e) => set("source", e.target.value)}
              >
                <option value="">—</option>
                {APPLICATION_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Checkbox
            label="Posted by a recruitment agency"
            checked={values.viaAgency}
            onChange={(e) => set("viaAgency", e.target.checked)}
          />
        </div>
      </section>

      {mode === "create" && (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="eyebrow">Steps so far</h3>
            <p className="mt-1 text-[11px] text-ink-subtle">
              Everything that already happened (applied, acknowledged,
              screening…) and anything already planned. The latest done step
              sets the current status.
            </p>
          </div>
          {err("steps") && (
            <p className="text-[11px] text-terra-700">
              {err("steps")!.join(" ")}
            </p>
          )}
          <ol className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <li
                key={i}
                className="relative rounded border border-sand-300 bg-white p-3 pr-9"
              >
                <StepFields
                  values={step}
                  withNote={false}
                  onChange={(next) =>
                    setSteps((all) => all.map((s, j) => (j === i ? next : s)))
                  }
                  errors={{
                    kind: fieldErrors[`steps.${i}.kind`],
                    title: fieldErrors[`steps.${i}.title`],
                    state: fieldErrors[`steps.${i}.state`],
                    date: fieldErrors[`steps.${i}.date`],
                  }}
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSteps((all) => all.filter((_, j) => j !== i))
                    }
                    className="absolute top-2 right-2 rounded p-1 text-ink-subtle hover:bg-terra-50 hover:text-terra-700"
                    aria-label="Remove this step"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ol>
          <Button
            size="sm"
            className="self-start"
            onClick={() =>
              setSteps((all) => [...all, emptyStep(all.at(-1)?.kind)])
            }
          >
            <Plus className="size-3.5" /> Add another step
          </Button>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <h3 className="eyebrow sm:col-span-2">Resume &amp; contact</h3>
        <div className="flex flex-col gap-2">
          <Field label="Resume sent" error={err("resumeId")}>
            {(p) => (
              <Select
                {...p}
                value={values.resumeId}
                onChange={(e) => set("resumeId", e.target.value)}
              >
                <option value="">None</option>
                {options.resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
                <option value={NEW}>Upload a new resume…</option>
              </Select>
            )}
          </Field>
          {values.resumeId === NEW && (
            <Field label="New resume (PDF or Word, added to the library)">
              {(p) => (
                <Input
                  {...p}
                  type="file"
                  accept=".pdf,.docx"
                  className="h-auto py-1.5 text-xs"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
              )}
            </Field>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Field label="Contact" error={err("contactId")}>
            {(p) => (
              <Select
                {...p}
                value={values.contactId}
                onChange={(e) => {
                  set("contactId", e.target.value);
                  // A new contact usually works for this company.
                  if (e.target.value === NEW && !newContact.company)
                    setNewContact((c) => ({ ...c, company: values.company }));
                }}
              >
                <option value="">None</option>
                {options.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.name} · ${c.company}` : c.name}
                  </option>
                ))}
                <option value={NEW}>New contact…</option>
              </Select>
            )}
          </Field>
        </div>
        {values.contactId === NEW && (
          <div className="rounded border border-sand-300 bg-white p-3 sm:col-span-2">
            <h4 className="mb-2 text-xs font-medium text-ink-muted">
              New contact
            </h4>
            <ContactFields
              values={newContact}
              onChange={setNewContact}
              // Create sends the contact with the application ("newContact.email");
              // edit creates it first ("email").
              errors={contactErrors(
                fieldErrors,
                mode === "create" ? "newContact." : "",
              )}
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="eyebrow">Notes</h3>
        {mode === "create" && (
          <Field
            label="Note"
            hint="Your own thoughts on this application. It becomes the first entry of its notes."
            error={err("note")}
          >
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
        )}
        <Field
          label="What I answered in the application form"
          hint="Markdown supported."
          error={err("formAnswers")}
        >
          {(p) => (
            <Textarea
              {...p}
              rows={5}
              className="font-mono text-xs"
              value={values.formAnswers}
              onChange={(e) => set("formAnswers", e.target.value)}
            />
          )}
        </Field>
      </section>

      {mode === "create" && (
        <section className="flex flex-col gap-2">
          <h3 className="eyebrow">Attachments</h3>
          <Field
            label="Cover letter, screenshots, certificates…"
            hint={
              attachments.length
                ? attachments.map((f) => f.name).join(", ")
                : "PDF, Word, PNG, JPEG or WebP, up to 10 MB each."
            }
          >
            {(p) => (
              <Input
                {...p}
                type="file"
                multiple
                accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                className="h-auto py-1.5 text-xs"
                onChange={(e) =>
                  setAttachments(Array.from(e.target.files ?? []))
                }
              />
            )}
          </Field>
        </section>
      )}

      <div className="flex justify-end gap-2 border-t border-sand-200 pt-4">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {mode === "create" ? "Save application" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
