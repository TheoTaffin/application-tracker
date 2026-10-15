"use client";

import { Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { FormError } from "@/components/ui/field";
import { addAttachmentsAction } from "@/server/actions/applications";
import { deleteFileAction } from "@/server/actions/files";
import { buttonClass } from "@/components/ui/button";

export function AddAttachments({ applicationId }: { applicationId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("attachments", f));
    setError(null);
    start(async () => {
      const result = await addAttachmentsAction(applicationId, formData);
      if (!result.ok) setError(result.error);
      if (input.current) input.current.value = "";
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      <label
        className={buttonClass("secondary", "sm", "cursor-pointer self-start")}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Paperclip className="size-3.5" />
        )}
        Attach files
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          disabled={pending}
          onChange={(e) => upload(e.target.files)}
        />
      </label>
    </div>
  );
}

export function RemoveAttachment({
  fileId,
  label,
}: {
  fileId: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Remove “${label}”?`))
          start(async () => void (await deleteFileAction(fileId)));
      }}
      className="rounded p-0.5 text-ink-subtle hover:bg-terra-50 hover:text-terra-700"
      aria-label={`Remove ${label}`}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <X className="size-3.5" />
      )}
    </button>
  );
}
