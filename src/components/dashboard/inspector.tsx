import { ArrowUpRight, ExternalLink, PenLine } from "lucide-react";
import { ContactCard } from "@/components/applications/contact-card";
import { FileRow } from "@/components/applications/documents";
import { Timeline } from "@/components/applications/timeline";
import { GroupBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatChf, formatWorkload, relativeDay } from "@/lib/format";
import type { ApplicationDetail } from "@/server/services/application-service";

/** Side panel ("dossier") for the application selected in the table. */
export function Inspector({
  application: a,
  today,
}: {
  application: ApplicationDetail;
  today: string;
}) {
  const due = a.nextActionAt ? relativeDay(a.nextActionAt, today) : null;
  const facts = [
    a.location,
    formatWorkload(a.workloadMin, a.workloadMax),
    formatChf(a.salaryAsk),
  ].filter(Boolean);

  return (
    <aside
      aria-label={`${a.company} details`}
      className="sticky top-20 hidden w-[360px] shrink-0 flex-col overflow-hidden rounded-lg border border-sand-300 bg-paper shadow-card xl:flex"
    >
      <div className="border-b border-sand-300 bg-sand-200/50 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{a.company}</h2>
              {a.offerUrl && (
                <a
                  href={a.offerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-subtle hover:text-ink"
                  aria-label="Open the job posting"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">{a.role}</p>
            {facts.length > 0 && (
              <p className="mt-0.5 text-[11px] text-ink-subtle tabular">
                {facts.join(" · ")}
              </p>
            )}
          </div>
          <GroupBadge group={a.statusGroup} />
        </div>
      </div>

      <div className="max-h-[calc(100vh-260px)] space-y-5 overflow-y-auto p-4">
        {due && (
          <div className="rounded-md border border-forest-200 bg-forest-50 p-3 shadow-sm">
            <span className="eyebrow text-forest-800">
              Next step · {due.label}
            </span>
            <p className="mt-1 text-xs font-medium">
              {a.nextActionNote || "Follow up"}
            </p>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">Status history</span>
            <span className="rounded-full border border-forest-200 bg-forest-100 px-2 py-0.5 font-mono text-[10px] text-forest-800">
              {a.events.length} {a.events.length === 1 ? "update" : "updates"}
            </span>
          </div>
          <Timeline events={a.events.slice(0, 5)} compact />
        </div>

        {a.contact && (
          <div>
            <span className="eyebrow mb-1.5 block">Contact</span>
            <ContactCard contact={a.contact} />
          </div>
        )}

        {(a.resume || a.attachments.length > 0) && (
          <div className="space-y-1.5">
            <span className="eyebrow block">Documents</span>
            {a.resume && <FileRow file={a.resume} badge="Resume" />}
            {a.attachments.map((f) => (
              <FileRow key={f.id} file={f} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-sand-300 bg-sand-200/50 p-3">
        <ButtonLink href={`/applications/${a.id}#update`} className="flex-1">
          <PenLine className="size-3.5" /> Log update
        </ButtonLink>
        <ButtonLink
          href={`/applications/${a.id}`}
          variant="primary"
          className="flex-1"
        >
          Open <ArrowUpRight className="size-3.5" />
        </ButtonLink>
      </div>
    </aside>
  );
}
