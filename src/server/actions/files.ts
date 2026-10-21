"use server";

import * as files from "@/server/services/file-service";
import type { FileDTO } from "@/server/services/dto";
import { InvalidInputError } from "@/server/services/errors";
import { filesFrom, runAction, type ActionResult } from "./result";

/** FormData fields: `file` and an optional `label`. Adds a resume to the library. */
export async function uploadResumeAction(
  formData: FormData,
): Promise<ActionResult<FileDTO>> {
  return runAction(async () => {
    const [file] = filesFrom(formData, "file");
    if (!file)
      throw new InvalidInputError("Choose a file", { file: ["Required"] });
    const label = formData.get("label");
    return files.uploadFile({
      file,
      kind: "resume",
      label: typeof label === "string" ? label : null,
    });
  });
}

export async function renameFileAction(
  id: string,
  input: unknown,
): Promise<ActionResult<FileDTO>> {
  return runAction(() => files.renameFile(id, input));
}

export async function deleteFileAction(id: string): Promise<ActionResult> {
  return runAction(() => files.deleteFile(id));
}
