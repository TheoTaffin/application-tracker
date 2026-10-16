"use server";

import * as progress from "@/server/services/progress-service";
import type { NoteDTO, StageDTO } from "@/server/services/dto";
import { runAction, type ActionResult } from "./result";

export async function addStageAction(
  applicationId: string,
  input: unknown,
): Promise<ActionResult<StageDTO>> {
  return runAction(() => progress.addStage(applicationId, input));
}

export async function updateStageAction(
  stageId: string,
  input: unknown,
): Promise<ActionResult<StageDTO>> {
  return runAction(() => progress.updateStage(stageId, input));
}

export async function deleteStageAction(
  stageId: string,
): Promise<ActionResult> {
  return runAction(() => progress.deleteStage(stageId));
}

export async function moveStageAction(
  stageId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  return runAction(() => progress.moveStage(stageId, direction));
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
