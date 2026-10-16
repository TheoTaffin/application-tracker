"use client";

import {
  Check,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/field";
import { formatBytes, formatDate } from "@/lib/format";
import {
  deleteFileAction,
  renameFileAction,
  uploadResumeAction,
} from "@/server/actions/files";
import type { FileDTO } from "@/server/services/dto";

export type ResumeItem = FileDTO & { uses: number };

export function UploadResume() {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upload = (file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    setError(null);
    start(async () => {
      const result = await uploadResumeAction(formData);
      if (!result.ok) setError(result.error);
      if (input.current) input.current.value = "";
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <label className={buttonClass("primary", "md", "cursor-pointer")}>
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        Upload resume
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          disabled={pending}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </label>
      <FormError message={error} />
    </div>
  );
}

export function ResumeCard({ resume }: { resume: ResumeItem }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(resume.label);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const rename = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await renameFileAction(resume.id, { label });
      if (!result.ok) return setError(result.error);
      setError(null);
      setEditing(false);
    });
  };

  const remove = () => {
    if (!window.confirm(`Delete “${resume.label}”?`)) return;
    start(async () => {
      const result = await deleteFileAction(resume.id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-sand-300 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded border border-sand-300 bg-sand-100 text-ink-subtle">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={rename} className="flex items-center gap-1">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                aria-label="Resume name"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                aria-label="Save name"
                disabled={pending}
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Cancel"
                onClick={() => setEditing(false)}
              >
                <X className="size-3.5" />
              </Button>
            </form>
          ) : (
            <p className="truncate text-sm font-medium">{resume.label}</p>
          )}
          <p
            className="truncate text-[11px] text-ink-subtle"
            title={resume.originalName}
          >
            {resume.originalName}
          </p>
          <p className="mt-1 font-mono text-[10px] text-ink-subtle">
            {formatDate(resume.uploadedAt, true)} · {formatBytes(resume.size)}
          </p>
        </div>
      </div>
      <FormError message={error} />
      <div className="flex items-center justify-between border-t border-sand-200 pt-3">
        <span className="text-[11px] text-ink-muted">
          {resume.uses === 0
            ? "Not used yet"
            : `Used in ${resume.uses} application${resume.uses > 1 ? "s" : ""}`}
        </span>
        <div className="flex items-center gap-0.5">
          <a
            href={resume.url}
            target="_blank"
            rel="noopener"
            className={buttonClass("ghost", "sm")}
            aria-label="Preview"
          >
            <Eye className="size-3.5" />
          </a>
          <a
            href={`${resume.url}?download`}
            className={buttonClass("ghost", "sm")}
            aria-label="Download"
          >
            <Download className="size-3.5" />
          </a>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Rename"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={pending || resume.uses > 0}
            aria-label="Delete"
            title={
              resume.uses > 0
                ? "In use by applications: it can't be deleted"
                : "Delete"
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}
