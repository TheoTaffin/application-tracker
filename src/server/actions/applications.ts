"use server";

import { extractOffer } from "@/server/extraction";
import type { ExtractionResult } from "@/server/extraction/types";
import * as applications from "@/server/services/application-service";
import { parseInput } from "@/server/services/errors";
import type { FileDTO, StatusEventDTO } from "@/server/services/dto";
import { extractOfferInput } from "@/lib/validation";
import { filesFrom, jsonPayload, runAction, type ActionResult } from "./result";

/** Resume and contact choices for the application form. */
export async function getFormOptionsAction(): Promise<
  ActionResult<applications.FormOptions>
> {
  return runAction(() => applications.getFormOptions(), { mutates: false });
}

/** Fetch a job posting and return prefilled fields; nothing is saved. */
export async function extractOfferAction(
  url: string,
): Promise<ActionResult<ExtractionResult>> {
  return runAction(
    () => extractOffer(parseInput(extractOfferInput, { url }).url),
    {
      mutates: false,
    },
  );
}

/**
 * FormData fields: `payload` (JSON, see NewApplicationInput), optional `resumeFile`
 * (new resume for the library) and any number of `attachments`.
 */
export async function createApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(() =>
    applications.createApplication(jsonPayload(formData), {
      resumeFile: filesFrom(formData, "resumeFile")[0] ?? null,
      attachments: filesFrom(formData, "attachments"),
    }),
  );
}

export async function updateApplicationAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  return runAction(() => applications.updateApplication(id, input));
}

export async function deleteApplicationAction(
  id: string,
): Promise<ActionResult> {
  return runAction(() => applications.deleteApplication(id));
}

export async function addStatusUpdateAction(
  applicationId: string,
  input: unknown,
): Promise<ActionResult<StatusEventDTO>> {
  return runAction(() => applications.addStatusUpdate(applicationId, input));
}

/** FormData fields: any number of `attachments`. */
export async function addAttachmentsAction(
  applicationId: string,
  formData: FormData,
): Promise<ActionResult<FileDTO[]>> {
  return runAction(() =>
    applications.addAttachments(
      applicationId,
      filesFrom(formData, "attachments"),
    ),
  );
}
