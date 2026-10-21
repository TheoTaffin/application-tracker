"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import {
  EditStepButton,
  MarkDoneButton,
} from "@/components/applications/step-timeline";
import { StatusBadge, StepKindBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { cx } from "@/lib/cx";
import { relativeDay } from "@/lib/format";
import type { WorkspaceApplication } from "@/server/services/application-service";

const chip = {
  overdue: "border-terra-200 bg-terra-100 text-terra-700",
  today: "border-terra-200 bg-terra-100 text-terra-700",
  soon: "border-ochre-200 bg-ochre-100 text-ochre-700",
  later: "border-sand-300 bg-sand-100 text-ink-muted",
};

/** Planned steps that are overdue or due soon: open the application, or act on the step. */
export function FollowUps({
  items,
  today,
  hours,
}: {
  items: WorkspaceApplication[];
  today: string;
  hours: number;
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader
        icon={<BellRing className="size-[18px] text-terra-700" />}
        title="Upcoming follow-ups"
        description={`Planned steps overdue or due in the next ${hours} hours.`}
        actions={
          <span className="font-mono text-xs text-ink-subtle">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        }
      />
      <ul className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => {
          const next = a.nextStep!;
          const due = relativeDay(next.date!, today);
          return (
            <li
              key={a.id}
              className="flex flex-col justify-between rounded-lg border border-sand-300 bg-white shadow-sm transition-colors hover:border-sand-400"
            >
              <Link href={`/applications/${a.id}`} className="block p-4 pb-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={cx(
                      "rounded border px-2 py-0.5 font-mono text-[11px] font-medium",
                      chip[due.urgency],
                    )}
                  >
                    {due.label}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <h3 className="text-base font-semibold hover:underline">
                  {a.company}
                </h3>
                <p className="mt-0.5 text-xs text-ink-muted">{a.role}</p>
                <div className="mt-3 border-t border-sand-200 pt-2.5 text-xs leading-relaxed">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StepKindBadge kind={next.kind} />
                    {next.title && (
                      <span className="font-medium text-ink">{next.title}</span>
                    )}
                  </span>
                  {next.note && (
                    <span className="mt-1 block text-ink-muted">
                      {next.note}
                    </span>
                  )}
                </div>
              </Link>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-sand-200 px-4 py-2.5">
                <span className="truncate text-[11px] text-ink-subtle">
                  {a.contactName
                    ? `Contact: ${a.contactName}`
                    : "No contact yet"}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <EditStepButton applicationId={a.id} step={next} />
                  <MarkDoneButton stepId={next.id} variant="primary" />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
