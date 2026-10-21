import { Link2, Mail, Phone } from "lucide-react";
import { initials } from "@/lib/format";
import type { ContactDTO } from "@/server/services/dto";

export function ContactCard({ contact }: { contact: ContactDTO }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-sand-300 bg-white p-2.5 shadow-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sand-200 text-xs font-medium">
          {initials(contact.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{contact.name}</p>
          <p className="truncate text-[10px] text-ink-subtle">
            {[contact.role, contact.company].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="rounded p-1 text-ink-subtle hover:bg-sand-200 hover:text-ink"
            aria-label={`Email ${contact.name}`}
          >
            <Mail className="size-4" />
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="rounded p-1 text-ink-subtle hover:bg-sand-200 hover:text-ink"
            aria-label={`Call ${contact.name}`}
          >
            <Phone className="size-4" />
          </a>
        )}
        {contact.linkedinUrl && (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 text-ink-subtle hover:bg-sand-200 hover:text-ink"
            aria-label={`${contact.name} on LinkedIn`}
          >
            <Link2 className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}
