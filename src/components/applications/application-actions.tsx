"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";
import { deleteApplicationAction } from "@/server/actions/applications";
import type { FormOptions } from "@/server/services/application-service";
import { ApplicationForm, type ApplicationValues } from "./application-form";

export function EditApplicationButton({
  applicationId,
  values,
  options,
}: {
  applicationId: string;
  values: ApplicationValues;
  options: FormOptions;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> Edit
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Edit application"
      >
        {open && (
          <ApplicationForm
            mode="edit"
            applicationId={applicationId}
            initialValues={values}
            options={options}
            onCancel={() => setOpen(false)}
            onDone={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

export function DeleteApplicationButton({
  applicationId,
  company,
}: {
  applicationId: string;
  company: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const result = await deleteApplicationAction(applicationId);
      if (!result.ok) return setError(result.error);
      router.push("/");
    });

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" /> Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete the ${company} application?`}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirm} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Delete permanently
            </Button>
          </>
        }
      >
        <FormError message={error} />
        <p className="text-[13px] text-ink-muted">
          Its status history and attachments are deleted too. Resumes and
          contacts stay in their libraries.
        </p>
      </Dialog>
    </>
  );
}
