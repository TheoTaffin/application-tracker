"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";
import {
  createContactAction,
  deleteContactAction,
  updateContactAction,
} from "@/server/actions/contacts";
import type { ContactDTO } from "@/server/services/dto";
import {
  contactErrors,
  ContactFields,
  contactValues,
  type ContactValues,
} from "./contact-fields";

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
  /** Awaited before the dialog closes, e.g. to link the new contact. */
  onSaved?: (contact: ContactDTO) => void | Promise<void>;
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
      try {
        await onSaved?.(result.data);
      } catch (err) {
        // The contact exists; what came after (e.g. linking it) failed.
        setError(`${values.name} was saved, but: ${(err as Error).message}`);
        return;
      }
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

/** Creates a contact in a dialog: on the Contacts page and on an application's page. */
export function NewContactButton({
  defaults,
  onCreated,
  label = "New contact",
  variant = "primary",
  size = "md",
}: {
  defaults?: Partial<ContactDTO>;
  onCreated?: (contact: ContactDTO) => void | Promise<void>;
  label?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> {label}
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
