import "server-only";
import type { ContactRow, FileRow, NoteRow, StepRow } from "@/server/db/schema";

/**
 * Data transfer objects: the only shapes services hand to pages and actions.
 * They never include storage keys or other internals.
 */

export interface FileDTO {
  id: string;
  kind: FileRow["kind"];
  label: string;
  originalName: string;
  mime: string;
  size: number;
  uploadedAt: Date;
  /** Same-origin download URL. */
  url: string;
}

export function toFileDTO(row: FileRow): FileDTO {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    originalName: row.originalName,
    mime: row.mime,
    size: row.size,
    uploadedAt: row.uploadedAt,
    url: `/api/files/${row.id}`,
  };
}

export type ContactDTO = Omit<ContactRow, "createdAt" | "updatedAt">;

export function toContactDTO(row: ContactRow): ContactDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    role: row.role,
    linkedinUrl: row.linkedinUrl,
    notes: row.notes,
  };
}

export type NoteDTO = Pick<NoteRow, "id" | "body" | "createdAt" | "updatedAt">;

export function toNoteDTO(row: NoteRow): NoteDTO {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type StepDTO = Pick<
  StepRow,
  "id" | "status" | "title" | "state" | "date" | "note" | "source" | "createdAt"
>;

export function toStepDTO(row: StepRow): StepDTO {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    state: row.state,
    date: row.date,
    note: row.note,
    source: row.source,
    createdAt: row.createdAt,
  };
}
