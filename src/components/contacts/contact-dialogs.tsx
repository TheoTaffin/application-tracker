"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import {
  createContactAction,
  deleteContactAction,
  updateContactAction,
} from "@/server/actions/contacts";
import type { ContactDTO } from "@/server/services/dto";

/**
 * Contacts are created and edited in one dialog (ContactForm), whether opened from
 * the Contacts page or from the application form (NewContactButton).
 */

type ContactValues = { [K in keyof Omit<ContactDTO, "id">]: string };

function contactValues(contact?: Partial<ContactDTO>): ContactValues {
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

function ContactFields({
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

/** The contact's field errors from an ActionResult. */
function contactErrors(fieldErrors: Record<string, string[]>) {
  const out: Partial<Record<keyof ContactValues, string[]>> = {};
  for (const key of Object.keys(contactValues()) as (keyof ContactValues)[]) {
    if (fieldErrors[key]) out[key] = fieldErrors[key];
  }
  return out;
}

function ContactForm({
  contact,
  defaults,
  onSaved,
  onDone,
}: {
  /** The contact to edit; omitted to create one. */
  contact?: ContactDTO;
  /** Prefilled values for a new contact (e.g. the application's company). */
  defaults?: Partial<ContactDTO>;
  onSaved?: (contact: ContactDTO) => void;
  onDone: () => void;
}) {
  const [values, setValues] = useState<ContactValues>(() =>
    contactValues(contact ?? defaults),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = contact
        ? await updateContactAction(contact.id, values)
        : await createContactAction(values);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      onSaved?.(result.data);
      onDone();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <FormError message={error} />
      </div>
      <div className="sm:col-span-2">
        <ContactFields
          values={values}
          onChange={setValues}
          errors={contactErrors(fieldErrors)}
        />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {contact ? "Save changes" : "Add contact"}
        </Button>
      </div>
    </form>
  );
}

/** Creates a contact in a dialog: on the Contacts page and from the application form. */
export function NewContactButton({
  defaults,
  onCreated,
  variant = "primary",
  size = "md",
  className,
}: {
  defaults?: Partial<ContactDTO>;
  onCreated?: (contact: ContactDTO) => void;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" /> New contact
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New contact">
        {open && (
          <ContactForm
            defaults={defaults}
            onSaved={onCreated}
            onDone={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

export function ContactRowActions({ contact }: { contact: ContactDTO }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const remove = () => {
    if (
      !window.confirm(
        `Delete ${contact.name}? Their applications are kept, without a contact.`,
      )
    )
      return;
    start(async () => void (await deleteContactAction(contact.id)));
  };
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Edit ${contact.name}`}
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Delete ${contact.name}`}
        onClick={remove}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${contact.name}`}
      >
        {open && (
          <ContactForm contact={contact} onDone={() => setOpen(false)} />
        )}
      </Dialog>
    </div>
  );
}
