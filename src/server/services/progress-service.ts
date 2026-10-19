import "server-only";
import { db } from "@/server/db/client";
import * as applicationsRepo from "@/server/repositories/applications";
import * as notesRepo from "@/server/repositories/notes";
import * as stepsRepo from "@/server/repositories/steps";
import { idInput, noteInput, stepInput } from "@/lib/validation";
import { toNoteDTO, toStepDTO, type NoteDTO, type StepDTO } from "./dto";
import { ConflictError, NotFoundError, parseInput } from "./errors";

/** An application's progress: its steps timeline and its notes. */

async function requireApplication(applicationId: string) {
  const id = parseInput(idInput, applicationId);
  if (!(await applicationsRepo.findApplication(db(), id)))
    throw new NotFoundError("Application");
  return id;
}

const LAST_DONE_STEP =
  "An application needs at least one step that happened: it defines the current status";

// ------------------------------------------------------------------------- steps

export async function addStep(
  applicationId: string,
  input: unknown,
): Promise<StepDTO> {
  const appId = await requireApplication(applicationId);
  const step = parseInput(stepInput, input);
  const [row] = await stepsRepo.insertSteps(db(), appId, [step]);
  return toStepDTO(row);
}

export async function updateStep(
  stepId: string,
  input: unknown,
): Promise<StepDTO> {
  const id = parseInput(idInput, stepId);
  const fields = parseInput(stepInput, input);
  return db().transaction(async (tx) => {
    const step = await stepsRepo.findStep(tx, id);
    if (!step) throw new NotFoundError("Step");
    if (
      step.state === "done" &&
      fields.state !== "done" &&
      (await stepsRepo.countOtherDoneSteps(tx, step.applicationId, id)) === 0
    ) {
      throw new ConflictError(LAST_DONE_STEP);
    }
    return toStepDTO((await stepsRepo.updateStep(tx, id, fields))!);
  });
}

export async function deleteStep(stepId: string): Promise<void> {
  const id = parseInput(idInput, stepId);
  await db().transaction(async (tx) => {
    const step = await stepsRepo.findStep(tx, id);
    if (!step) throw new NotFoundError("Step");
    if (
      step.state === "done" &&
      (await stepsRepo.countOtherDoneSteps(tx, step.applicationId, id)) === 0
    ) {
      throw new ConflictError(LAST_DONE_STEP);
    }
    await stepsRepo.deleteStep(tx, id);
  });
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
