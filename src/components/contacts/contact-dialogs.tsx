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

type Values = Omit<ContactDTO, "id">;
const empty: Values = {
  name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  linkedinUrl: "",
  notes: "",
};

function ContactForm({
  contact,
  onDone,
}: {
  contact?: ContactDTO;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Values>(() => ({
    ...empty,
    ...contact,
  }));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();
  const set =
    (key: keyof Values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

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
      onDone();
    });
  };

  const text = (
    key: keyof Values,
    label: string,
    props: React.ComponentProps<"input"> = {},
  ) => (
    <Field label={label} error={fieldErrors[key]}>
      {(p) => (
        <Input
          {...p}
          {...props}
          value={values[key] ?? ""}
          onChange={set(key)}
        />
      )}
    </Field>
  );

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <FormError message={error} />
      </div>
      {text("name", "Name", { required: true })}
      {text("role", "Role", { placeholder: "Recruiter, Hiring manager…" })}
      {text("company", "Company")}
      {text("email", "Email", { type: "email" })}
      {text("phone", "Phone", { type: "tel" })}
      {text("linkedinUrl", "LinkedIn URL", { type: "url" })}
      <Field label="Notes" className="sm:col-span-2" error={fieldErrors.notes}>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            value={values.notes ?? ""}
            onChange={set("notes")}
          />
        )}
      </Field>
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

export function NewContactButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> New contact
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New contact">
        {open && <ContactForm onDone={() => setOpen(false)} />}
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
