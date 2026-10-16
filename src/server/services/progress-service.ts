import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, type Executor } from "@/server/db/client";
import { applicationStages } from "@/server/db/schema";
import * as applicationsRepo from "@/server/repositories/applications";
import * as notesRepo from "@/server/repositories/notes";
import * as stagesRepo from "@/server/repositories/stages";
import {
  idInput,
  noteInput,
  stageInput,
  stageMoveInput,
} from "@/lib/validation";
import { toNoteDTO, toStageDTO, type NoteDTO, type StageDTO } from "./dto";
import { NotFoundError, parseInput } from "./errors";

/** Custom stages and notes of an application. */

async function requireApplication(applicationId: string) {
  const id = parseInput(idInput, applicationId);
  if (!(await applicationsRepo.findApplication(db(), id)))
    throw new NotFoundError("Application");
  return id;
}

// ------------------------------------------------------------------------ stages

export async function addStage(
  applicationId: string,
  input: unknown,
): Promise<StageDTO> {
  const appId = await requireApplication(applicationId);
  const fields = parseInput(stageInput, input);
  return db().transaction(async (tx) => {
    // Only one stage is "the current one".
    if (fields.state === "active") await demoteActive(tx, appId);
    return toStageDTO(await stagesRepo.insertStage(tx, appId, fields));
  });
}

export async function updateStage(
  stageId: string,
  input: unknown,
): Promise<StageDTO> {
  const id = parseInput(idInput, stageId);
  const fields = parseInput(stageInput, input);
  return db().transaction(async (tx) => {
    const stage = await stagesRepo.findStage(tx, id);
    if (!stage) throw new NotFoundError("Stage");
    if (fields.state === "active")
      await demoteActive(tx, stage.applicationId, id);
    return toStageDTO((await stagesRepo.updateStage(tx, id, fields))!);
  });
}

export async function deleteStage(stageId: string): Promise<void> {
  const row = await stagesRepo.deleteStage(db(), parseInput(idInput, stageId));
  if (!row) throw new NotFoundError("Stage");
}

/** Swap a stage with its neighbour. */
export async function moveStage(
  stageId: string,
  direction: unknown,
): Promise<void> {
  const id = parseInput(idInput, stageId);
  const dir = parseInput(stageMoveInput, direction);
  await db().transaction(async (tx) => {
    const stage = await stagesRepo.findStage(tx, id);
    if (!stage) throw new NotFoundError("Stage");
    const siblings = await tx
      .select()
      .from(applicationStages)
      .where(eq(applicationStages.applicationId, stage.applicationId))
      .orderBy(asc(applicationStages.position));
    const index = siblings.findIndex((s) => s.id === id);
    const other = siblings[dir === "up" ? index - 1 : index + 1];
    if (!other) return;
    await stagesRepo.updateStage(tx, stage.id, { position: other.position });
    await stagesRepo.updateStage(tx, other.id, { position: stage.position });
  });
}

/** An "active" stage that is replaced by another one counts as passed. */
async function demoteActive(
  tx: Executor,
  applicationId: string,
  exceptId?: string,
) {
  for (const s of await stagesRepo.stagesInState(tx, applicationId, "active")) {
    if (s.id !== exceptId)
      await stagesRepo.updateStage(tx, s.id, { state: "passed" });
  }
}

// ------------------------------------------------------------------------- notes

export async function addNote(
  applicationId: string,
  input: unknown,
): Promise<NoteDTO> {
  const appId = await requireApplication(applicationId);
  const { body } = parseInput(noteInput, input);
  return toNoteDTO(await notesRepo.insertNote(db(), appId, body));
}

export async function updateNote(
  noteId: string,
  input: unknown,
): Promise<NoteDTO> {
  const { body } = parseInput(noteInput, input);
  const row = await notesRepo.updateNote(
    db(),
    parseInput(idInput, noteId),
    body,
  );
  if (!row) throw new NotFoundError("Note");
  return toNoteDTO(row);
}

export async function deleteNote(noteId: string): Promise<void> {
  const row = await notesRepo.deleteNote(db(), parseInput(idInput, noteId));
  if (!row) throw new NotFoundError("Note");
}
