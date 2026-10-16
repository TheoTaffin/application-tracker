"use client";

import { Check, Link2, Loader2, Sparkles, TriangleAlert } from "lucide-react";
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
  APPLICATION_STATUSES,
  STATUS_LABEL,
  type ApplicationStatus,
} from "@/lib/status";
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
  appliedAt: string;
  nextActionAt: string;
  nextActionNote: string;
  description: string;
  formAnswers: string;
  offerSnapshot: string;
  resumeId: string;
  contactId: string;
}

const NEW = "__new__";

function todayInZurich() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(
    new Date(),
  );
}

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
    appliedAt: todayInZurich(),
    nextActionAt: "",
    nextActionNote: "",
    description: "",
    formAnswers: "",
    offerSnapshot: "",
    resumeId: "",
    contactId: "",
  };
}

/**
 * Extracted fields only fill what the user has not typed yet. The posting's own text
 * goes to the offer snapshot; "Description" stays the user's notes.
 */
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
  const [initialStatus, setInitialStatus] =
    useState<ApplicationStatus>("applied");
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    role: "",
  });
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
    fieldErrors[key] ??
    fieldErrors[`application.${key}`] ??
    fieldErrors[`newContact.${key}`];

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
      setValues((v) => ({
        ...mergeExtracted(v, result.data.fields),
        offerUrl: url,
        // The structured description is cleaner than the whole-page snapshot.
        offerSnapshot:
          result.data.fields.description ??
          result.data.snapshot ??
          v.offerSnapshot,
      }));
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
            initialStatus,
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <h3 className="eyebrow sm:col-span-2">Process</h3>
        <Field label="Applied on" error={err("appliedAt")}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={values.appliedAt}
              onChange={(e) => set("appliedAt", e.target.value)}
            />
          )}
        </Field>
        {mode === "create" ? (
          <Field label="Current status">
            {(p) => (
              <Select
                {...p}
                value={initialStatus}
                onChange={(e) =>
                  setInitialStatus(e.target.value as ApplicationStatus)
                }
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Next action on" error={err("nextActionAt")}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={values.nextActionAt}
              onChange={(e) => set("nextActionAt", e.target.value)}
            />
          )}
        </Field>
        <Field label="Next action" error={err("nextActionNote")}>
          {(p) => (
            <Input
              {...p}
              placeholder="Follow up with the recruiter"
              value={values.nextActionNote}
              onChange={(e) => set("nextActionNote", e.target.value)}
            />
          )}
        </Field>
      </section>

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
                onChange={(e) => set("contactId", e.target.value)}
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
          {values.contactId === NEW && (
            <div className="grid grid-cols-1 gap-2 rounded border border-sand-300 bg-white p-3">
              <Field label="Name" error={err("name")}>
                {(p) => (
                  <Input
                    {...p}
                    value={newContact.name}
                    onChange={(e) =>
                      setNewContact((c) => ({ ...c, name: e.target.value }))
                    }
                  />
                )}
              </Field>
              <Field label="Email" error={err("email")}>
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    value={newContact.email}
                    onChange={(e) =>
                      setNewContact((c) => ({ ...c, email: e.target.value }))
                    }
                  />
                )}
              </Field>
              <Field label="Role" error={err("role")}>
                {(p) => (
                  <Input
                    {...p}
                    placeholder="Recruiter, Hiring manager…"
                    value={newContact.role}
                    onChange={(e) =>
                      setNewContact((c) => ({ ...c, role: e.target.value }))
                    }
                  />
                )}
              </Field>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="eyebrow">Notes</h3>
        <Field
          label="Description"
          hint="Your own notes about the role."
          error={err("description")}
        >
          {(p) => (
            <Textarea
              {...p}
              rows={5}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          )}
        </Field>
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
        {values.offerSnapshot && (
          <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
            <Link2 className="size-3" />
            Offer text saved (
            {values.offerSnapshot.length.toLocaleString("de-CH")} characters),
            in case the posting disappears.
          </p>
        )}
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
