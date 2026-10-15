"use client";

import { ArrowUpRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { ContactCard } from "@/components/applications/contact-card";
import { FileRow } from "@/components/applications/documents";
import { LogUpdateButton } from "@/components/applications/log-update-dialog";
import { NotesPanel } from "@/components/applications/notes-panel";
import { StageProgress } from "@/components/applications/stage-progress";
import { Timeline } from "@/components/applications/timeline";
import { GroupBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { formatChf, formatWorkload, relativeDay } from "@/lib/format";
import type {
  FormOptions,
  WorkspaceApplication,
} from "@/server/services/application-service";

type Tab = "overview" | "notes" | "history";

/** The selected application's "dossier", next to the table. */
export function SidePanel({
  application: a,
  today,
  options,
}: {
  application: WorkspaceApplication;
  today: string;
  options: FormOptions;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const due = a.nextActionAt ? relativeDay(a.nextActionAt, today) : null;
  const facts = [
    a.location,
    formatWorkload(a.workloadMin, a.workloadMax),
    formatChf(a.salaryAsk),
  ].filter(Boolean);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview & stages" },
    { key: "notes", label: "Notes", count: a.notes.length },
    { key: "history", label: "History", count: a.events.length },
  ];

  return (
    <aside
      aria-label={`${a.company} details`}
      className="sticky top-20 hidden w-[380px] shrink-0 flex-col overflow-hidden rounded-lg border border-sand-300 bg-paper shadow-card xl:flex"
    >
      <div className="border-b border-sand-300 bg-sand-200/50 px-4 pt-4">
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
        <div
          role="tablist"
          aria-label="Application details"
          className="mt-4 flex gap-4"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                "-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-xs transition-colors",
                tab === t.key
                  ? "border-forest-800 font-medium text-forest-900"
                  : "border-transparent text-ink-subtle hover:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="rounded bg-sand-200 px-1.5 font-mono text-[10px] text-ink">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        className="max-h-[calc(100vh-280px)] space-y-5 overflow-y-auto p-4"
      >
        {tab === "overview" && (
          <>
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
            <StageProgress applicationId={a.id} stages={a.stages} compact />
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
          </>
        )}
        {tab === "notes" && <NotesPanel applicationId={a.id} notes={a.notes} />}
        {tab === "history" && <Timeline events={a.events} compact />}
      </div>

      <div className="flex items-center gap-2 border-t border-sand-300 bg-sand-200/50 p-3">
        <LogUpdateButton
          applicationId={a.id}
          company={a.company}
          currentStatus={a.status}
          contacts={options.contacts}
          currentContactId={a.contact?.id ?? null}
          className="flex-1"
        />
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
