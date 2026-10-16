"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Textarea } from "@/components/ui/field";
import { formatDate } from "@/lib/format";
import {
  addNoteAction,
  deleteNoteAction,
  updateNoteAction,
} from "@/server/actions/progress";
import type { NoteDTO } from "@/server/services/dto";

const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Zurich",
});

function NoteItem({ note }: { note: NoteDTO }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const created = new Date(note.createdAt);

  const save = () =>
    start(async () => {
      const result = await updateNoteAction(note.id, { body });
      if (!result.ok) return setError(result.error);
      setError(null);
      setEditing(false);
    });

  const remove = () =>
    start(async () => {
      if (!window.confirm("Delete this note?")) return;
      const result = await deleteNoteAction(note.id);
      if (!result.ok) setError(result.error);
    });

  return (
    <li className="group rounded-md border border-sand-300 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <time
          dateTime={created.toISOString()}
          className="font-mono text-[10px] text-ink-subtle"
        >
          {formatDate(created, true)} · {time.format(created)}
        </time>
        <span className="hidden gap-0.5 group-focus-within:flex group-hover:flex">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded p-0.5 text-ink-subtle hover:bg-sand-200"
            aria-label="Edit note"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded p-0.5 text-ink-subtle hover:bg-terra-50 hover:text-terra-700"
            aria-label="Delete note"
          >
            <Trash2 className="size-3" />
          </button>
        </span>
      </div>
      <FormError message={error} />
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Note"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={save}
              disabled={pending}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs leading-relaxed whitespace-pre-line text-ink">
          {note.body}
        </p>
      )}
    </li>
  );
}

/** Dated notes log: quick thoughts, call summaries, things to remember. */
export function NotesPanel({
  applicationId,
  notes,
}: {
  applicationId: string;
  notes: NoteDTO[];
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!body.trim()) return;
    start(async () => {
      const result = await addNoteAction(applicationId, { body });
      if (!result.ok) return setError(result.error);
      setError(null);
      setBody("");
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={add} className="flex flex-col gap-2">
        <FormError message={error} />
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          placeholder="Write a note… (Ctrl+Enter to save)"
          aria-label="New note"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="self-end"
          disabled={pending || !body.trim()}
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Add note
        </Button>
      </form>
      {notes.length === 0 ? (
        <p className="py-4 text-center text-xs text-ink-subtle">
          No notes yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </ul>
      )}
    </div>
  );
}
