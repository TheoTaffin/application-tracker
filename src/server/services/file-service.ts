import "server-only";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { db } from "@/server/db/client";
import * as filesRepo from "@/server/repositories/files";
import * as storage from "@/server/storage/s3";
import { fileLabelInput, idInput } from "@/lib/validation";
import type { FileKind } from "@/lib/enums";
import { toFileDTO, type FileDTO } from "./dto";
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
  parseInput,
} from "./errors";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Allowed types per kind, checked against the file's actual bytes, not its name. */
const ALLOWED_MIME: Record<FileKind, readonly string[]> = {
  resume: ["application/pdf", DOCX],
  attachment: [
    "application/pdf",
    DOCX,
    "image/png",
    "image/jpeg",
    "image/webp",
  ],
};

/** Types a browser may display inline; everything else is served as a download. */
export const INLINE_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  // Drop control characters and quotes that could break headers.
  const clean = base
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .trim()
    .slice(0, 200);
  return clean || "file";
}

const withoutExtension = (name: string) => name.replace(/\.[^.]+$/, "") || name;

export interface UploadInput {
  file: File;
  kind: FileKind;
  /** Required for attachments, forbidden for resumes (enforced in the DB too). */
  applicationId?: string | null;
  label?: string | null;
}

export async function uploadFile(input: UploadInput): Promise<FileDTO> {
  const { file, kind } = input;
  const applicationId = input.applicationId ?? null;
  if (kind === "attachment" && !applicationId) {
    throw new InvalidInputError("Attachments must belong to an application");
  }
  if (kind === "resume" && applicationId) {
    throw new InvalidInputError(
      "Resumes belong to the library, not to an application",
    );
  }
  if (file.size === 0) throw new InvalidInputError("The file is empty");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new InvalidInputError(
      `Files are limited to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !ALLOWED_MIME[kind].includes(detected.mime)) {
    const allowed =
      kind === "resume" ? "PDF or Word" : "PDF, Word, PNG, JPEG or WebP";
    throw new InvalidInputError(
      `Unsupported file type. Please upload a ${allowed} file.`,
    );
  }

  const originalName = sanitizeName(file.name);
  const label = input.label?.trim() || withoutExtension(originalName);
  const storageKey = `${kind}s/${randomUUID()}`;

  await storage.putObject(storageKey, bytes, detected.mime);
  try {
    const row = await filesRepo.insertFile(db(), {
      kind,
      label: label.slice(0, 200),
      originalName,
      mime: detected.mime,
      size: bytes.byteLength,
      storageKey,
      applicationId,
    });
    return toFileDTO(row);
  } catch (err) {
    await storage.deleteObjects([storageKey]).catch(() => {});
    throw err;
  }
}

export async function listResumes() {
  const rows = await filesRepo.listResumes(db());
  return rows.map(({ file, uses }) => ({
    ...toFileDTO(file),
    uses: uses ?? 0,
  }));
}

export async function listAttachments(
  applicationId: string,
): Promise<FileDTO[]> {
  const rows = await filesRepo.listAttachments(
    db(),
    parseInput(idInput, applicationId),
  );
  return rows.map(toFileDTO);
}

export async function renameFile(id: string, input: unknown): Promise<FileDTO> {
  const { label } = parseInput(fileLabelInput, input);
  const row = await filesRepo.renameFile(db(), parseInput(idInput, id), label);
  if (!row) throw new NotFoundError("File");
  return toFileDTO(row);
}

export async function deleteFile(id: string): Promise<void> {
  const fileId = parseInput(idInput, id);
  const row = await db().transaction(async (tx) => {
    const file = await filesRepo.findFile(tx, fileId);
    if (!file) throw new NotFoundError("File");
    if (file.kind === "resume") {
      const uses = await filesRepo.countResumeUses(tx, fileId);
      if (uses > 0) {
        throw new ConflictError(
          `This resume is used by ${uses} application(s)`,
        );
      }
    }
    return filesRepo.deleteFile(tx, fileId);
  });
  // Delete the object only once the row is gone: an orphaned object is harmless,
  // a row pointing at a missing object is not.
  if (row) await storage.deleteObjects([row.storageKey]).catch(() => {});
}

/** Metadata plus a byte stream, for the download route. */
export async function openFile(id: string) {
  const parsed = idInput.safeParse(id);
  if (!parsed.success) return null;
  const row = await filesRepo.findFile(db(), parsed.data);
  if (!row) return null;
  return {
    file: toFileDTO(row),
    stream: await storage.getObjectStream(row.storageKey),
  };
}
