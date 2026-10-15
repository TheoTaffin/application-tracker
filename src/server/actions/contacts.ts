"use server";

import * as contacts from "@/server/services/contact-service";
import type { ContactDTO } from "@/server/services/dto";
import { runAction, type ActionResult } from "./result";

export async function createContactAction(
  input: unknown,
): Promise<ActionResult<ContactDTO>> {
  return runAction(() => contacts.createContact(input));
}

export async function updateContactAction(
  id: string,
  input: unknown,
): Promise<ActionResult<ContactDTO>> {
  return runAction(() => contacts.updateContact(id, input));
}

export async function deleteContactAction(id: string): Promise<ActionResult> {
  return runAction(() => contacts.deleteContact(id));
}
