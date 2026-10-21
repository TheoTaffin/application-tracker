"use client";

import { ArrowUpRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { ContactCard } from "@/components/applications/contact-card";
import { FileRow } from "@/components/applications/documents";
import { NotesPanel } from "@/components/applications/notes-panel";
import {
  AddStepButton,
  StepTimeline,
} from "@/components/applications/step-timeline";
import { GroupBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { formatChf, formatWorkload, relativeDay } from "@/lib/format";
import { stepLabel } from "@/lib/steps";
import type { WorkspaceApplication } from "@/server/services/application-service";

type Tab = "overview" | "notes";

/** The selected application's "dossier", next to the table. */
export function SidePanel({
  application: a,
  today,
}: {
  application: WorkspaceApplication;
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const next = a.nextStep;
  const due = next?.date ? relativeDay(next.date, today) : null;
  const facts = [
    a.location,
    formatWorkload(a.workloadMin, a.workloadMax),
    formatChf(a.salaryAsk),
  ].filter(Boolean);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview & steps" },
    { key: "notes", label: "Notes", count: a.notes.length },
  ];

  return (
    <aside
      aria-label={`${a.company} details`}
      className="flex w-full shrink-0 flex-col overflow-hidden rounded-lg border border-sand-300 bg-paper shadow-card xl:sticky xl:top-20 xl:w-[380px]"
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
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusBadge status={a.status} />
            <GroupBadge group={a.statusGroup} />
          </div>
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
            {next && (
              <div className="rounded-md border border-forest-200 bg-forest-50 p-3 shadow-sm">
                <span className="eyebrow text-forest-800">
                  Next step · {due?.label ?? "no date yet"}
                </span>
                <p className="mt-1 text-xs font-medium">{stepLabel(next)}</p>
                {next.note && (
                  <p className="mt-1 text-[11px] text-ink-muted">{next.note}</p>
                )}
              </div>
            )}
            <StepTimeline applicationId={a.id} steps={a.steps} compact />
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
      </div>

      <div className="flex items-center gap-2 border-t border-sand-300 bg-sand-200/50 p-3">
        <AddStepButton
          applicationId={a.id}
          defaultKind={a.status}
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
