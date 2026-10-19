"use client";

import { Field, Input, Textarea } from "@/components/ui/field";
import type { ContactDTO } from "@/server/services/dto";

/**
 * The contact form's fields, used wherever a contact is created or edited (Contacts
 * page, and "New contact…" in the application form), so both stay identical.
 */

export type ContactValues = { [K in keyof Omit<ContactDTO, "id">]: string };

export function contactValues(contact?: Partial<ContactDTO>): ContactValues {
  return {
    name: contact?.name ?? "",
    role: contact?.role ?? "",
    company: contact?.company ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    linkedinUrl: contact?.linkedinUrl ?? "",
    notes: contact?.notes ?? "",
  };
}

const TEXT_FIELDS: {
  key: keyof ContactValues;
  label: string;
  props?: React.ComponentProps<"input">;
}[] = [
  { key: "name", label: "Name", props: { required: true } },
  {
    key: "role",
    label: "Role",
    props: { placeholder: "Recruiter, Hiring manager…" },
  },
  { key: "company", label: "Company" },
  { key: "email", label: "Email", props: { type: "email" } },
  { key: "phone", label: "Phone", props: { type: "tel" } },
  { key: "linkedinUrl", label: "LinkedIn URL", props: { type: "url" } },
];

export function ContactFields({
  values,
  onChange,
  errors = {},
}: {
  values: ContactValues;
  onChange: (values: ContactValues) => void;
  /** Keyed by field name (name, email…). */
  errors?: Partial<Record<keyof ContactValues, string[]>>;
}) {
  const set = (key: keyof ContactValues, value: string) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {TEXT_FIELDS.map(({ key, label, props }) => (
        <Field key={key} label={label} error={errors[key]}>
          {(p) => (
            <Input
              {...p}
              {...props}
              value={values[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          )}
        </Field>
      ))}
      <Field label="Notes" className="sm:col-span-2" error={errors.notes}>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

/** Field errors for the contact, from an ActionResult whose keys may be prefixed. */
export function contactErrors(
  fieldErrors: Record<string, string[]>,
  prefix = "",
) {
  const out: Partial<Record<keyof ContactValues, string[]>> = {};
  for (const key of Object.keys(contactValues()) as (keyof ContactValues)[]) {
    const errors = fieldErrors[`${prefix}${key}`];
    if (errors) out[key] = errors;
  }
  return out;
}
