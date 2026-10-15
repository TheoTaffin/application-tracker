"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import {
  APPLICATION_STATUSES,
  STATUS_LABEL,
  type ApplicationStatus,
} from "@/lib/status";
import { addStatusUpdateAction } from "@/server/actions/applications";

const KEEP = "__keep__";

/** "Log an update": a new status event, optionally switching the contact. */
export function StatusUpdateForm({
  applicationId,
  currentStatus,
  contacts,
  currentContactId,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
  contacts: { id: string; name: string; company: string | null }[];
  currentContactId: string | null;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
  }).format(new Date());
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [occurredAt, setOccurredAt] = useState(today);
  const [note, setNote] = useState("");
  const [contactId, setContactId] = useState(KEEP);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await addStatusUpdateAction(applicationId, {
        status,
        note,
        occurredAt,
        ...(contactId !== KEEP && { contactId }),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setNote("");
      setContactId(KEEP);
      setFieldErrors({});
      setSaved(true);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Status" error={fieldErrors.status}>
          {(p) => (
            <Select
              {...p}
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Date" error={fieldErrors.occurredAt}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={occurredAt}
              max={today}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Note" error={fieldErrors.note}>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            placeholder="What happened? e.g. call with HR, they want B2 German"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <Field label="Contact" error={fieldErrors.contactId}>
        {(p) => (
          <Select
            {...p}
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value={KEEP}>Keep current contact</option>
            {currentContactId && <option value="">Remove contact</option>}
            {contacts
              .filter((c) => c.id !== currentContactId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Switch to {c.company ? `${c.name} · ${c.company}` : c.name}
                </option>
              ))}
          </Select>
        )}
      </Field>
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-forest-700">Update saved</span>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Log update
        </Button>
      </div>
    </form>
  );
}
