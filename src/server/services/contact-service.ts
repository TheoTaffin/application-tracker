import "server-only";
import { db } from "@/server/db/client";
import * as contactsRepo from "@/server/repositories/contacts";
import { contactInput, idInput } from "@/lib/validation";
import { toContactDTO, type ContactDTO } from "./dto";
import { NotFoundError, parseInput } from "./errors";

export async function createContact(input: unknown): Promise<ContactDTO> {
  const values = parseInput(contactInput, input);
  return toContactDTO(await contactsRepo.insertContact(db(), values));
}

export async function updateContact(
  id: string,
  input: unknown,
): Promise<ContactDTO> {
  const values = parseInput(contactInput, input);
  const row = await contactsRepo.updateContact(
    db(),
    parseInput(idInput, id),
    values,
  );
  if (!row) throw new NotFoundError("Contact");
  return toContactDTO(row);
}

/** Applications that referenced the contact keep existing, without a contact. */
export async function deleteContact(id: string): Promise<void> {
  const row = await contactsRepo.deleteContact(db(), parseInput(idInput, id));
  if (!row) throw new NotFoundError("Contact");
}

export async function getContact(id: string): Promise<ContactDTO | null> {
  const parsed = idInput.safeParse(id);
  if (!parsed.success) return null;
  const row = await contactsRepo.findContact(db(), parsed.data);
  return row ? toContactDTO(row) : null;
}

export async function listContacts() {
  const rows = await contactsRepo.listContacts(db());
  return rows.map(({ contact, applicationCount }) => ({
    ...toContactDTO(contact),
    applicationCount: applicationCount ?? 0,
  }));
}
