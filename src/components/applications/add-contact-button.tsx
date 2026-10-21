"use client";

import { NewContactButton } from "@/components/contacts/contact-dialogs";
import { setApplicationContactAction } from "@/server/actions/applications";

/** Creates a contact (same dialog as the Contacts page) and links it to the application. */
export function AddContactButton({
  applicationId,
  company,
}: {
  applicationId: string;
  company: string;
}) {
  return (
    <NewContactButton
      label="Add contact"
      variant="secondary"
      size="sm"
      // A new contact usually works for this company.
      defaults={{ company }}
      onCreated={async (contact) => {
        const result = await setApplicationContactAction(
          applicationId,
          contact.id,
        );
        if (!result.ok) throw new Error(result.error);
      }}
    />
  );
}
