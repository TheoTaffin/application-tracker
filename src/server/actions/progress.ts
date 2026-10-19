"use server";

import * as progress from "@/server/services/progress-service";
import type { NoteDTO, StepDTO } from "@/server/services/dto";
import { runAction, type ActionResult } from "./result";

export async function addStepAction(
  applicationId: string,
  input: unknown,
): Promise<ActionResult<StepDTO>> {
  return runAction(() => progress.addStep(applicationId, input));
}

export async function updateStepAction(
  stepId: string,
  input: unknown,
): Promise<ActionResult<StepDTO>> {
  return runAction(() => progress.updateStep(stepId, input));
}

export async function deleteStepAction(stepId: string): Promise<ActionResult> {
  return runAction(() => progress.deleteStep(stepId));
}

export async function addNoteAction(
  applicationId: string,
  input: unknown,
): Promise<ActionResult<NoteDTO>> {
  return runAction(() => progress.addNote(applicationId, input));
}

export async function updateNoteAction(
  noteId: string,
  input: unknown,
): Promise<ActionResult<NoteDTO>> {
  return runAction(() => progress.updateNote(noteId, input));
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  return runAction(() => progress.deleteNote(noteId));
}
