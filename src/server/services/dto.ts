import "server-only";
import type {
  ContactRow,
  FileRow,
  NoteRow,
  StageRow,
  StatusEventRow,
} from "@/server/db/schema";

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

export type StatusEventDTO = Pick<
  StatusEventRow,
  "id" | "status" | "note" | "occurredAt" | "source"
>;

export function toStatusEventDTO(row: StatusEventRow): StatusEventDTO {
  return {
    id: row.id,
    status: row.status,
    note: row.note,
    occurredAt: row.occurredAt,
    source: row.source,
  };
}

export type StageDTO = Pick<
  StageRow,
  "id" | "name" | "state" | "date" | "note" | "position"
>;

export function toStageDTO(row: StageRow): StageDTO {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    date: row.date,
    note: row.note,
    position: row.position,
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
