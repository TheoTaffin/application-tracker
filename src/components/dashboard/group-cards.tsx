"use client";

import { Archive, Hourglass, RefreshCw } from "lucide-react";
import { Dot } from "@/components/ui/badge";
import { cx } from "@/lib/cx";
import {
  APPLICATION_STATUSES,
  STATUS_GROUP_TONE,
  STATUS_LABEL,
  statusGroup,
  type ApplicationStatus,
  type StatusGroup,
} from "@/lib/status";
import type { Dashboard } from "@/server/services/application-service";

const CARDS: Record<
  StatusGroup,
  {
    title: string;
    noun: (n: number) => string;
    icon: React.ReactNode;
    frame: string;
    selected: string;
    badge: string;
    eyebrow: string;
  }
> = {
  pending: {
    title: "Pending",
    noun: (n) => `${n} ${n === 1 ? "application" : "applications"}`,
    icon: <Hourglass className="size-4" />,
    frame: "border-ochre-200",
    selected: "ring-2 ring-ochre-200",
    badge: "border-ochre-200 bg-ochre-100 text-ochre-700",
    eyebrow: "text-ochre-700",
  },
  ongoing: {
    title: "On-going",
    noun: (n) => `${n} in progress`,
    icon: <RefreshCw className="size-4" />,
    frame: "border-forest-200",
    selected: "ring-2 ring-forest-200",
    badge: "border-forest-200 bg-forest-100 text-forest-700",
    eyebrow: "text-forest-700",
  },
  closed: {
    title: "Closed",
    noun: (n) => `${n} ${n === 1 ? "application" : "applications"}`,
    icon: <Archive className="size-4" />,
    frame: "border-sand-300",
    selected: "ring-2 ring-sand-300",
    badge: "border-sand-300 bg-sand-100 text-ink-muted",
    eyebrow: "text-ink-subtle",
  },
};

/** "3 Applied · 2 Acknowledged": the detailed funnel inside each group. */
function breakdown(
  group: StatusGroup,
  byStatus: Record<ApplicationStatus, number>,
) {
  const parts = APPLICATION_STATUSES.filter(
    (s) => statusGroup(s) === group && byStatus[s] > 0,
  ).map((s) => `${byStatus[s]} ${STATUS_LABEL[s]}`);
  return parts.join(" · ") || "None yet";
}

export function GroupCards({
  dashboard,
  active,
  onSelect,
}: {
  dashboard: Dashboard;
  active: string;
  onSelect: (group: StatusGroup) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {(Object.keys(CARDS) as StatusGroup[]).map((group) => {
        const card = CARDS[group];
        return (
          <button
            type="button"
            key={group}
            onClick={() => onSelect(group)}
            aria-pressed={active === group}
            className={cx(
              "flex items-start justify-between rounded-lg border bg-white p-4 text-left shadow-card transition-colors hover:border-sand-400",
              card.frame,
              active === group && card.selected,
            )}
          >
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5">
                <Dot tone={STATUS_GROUP_TONE[group]} className="size-2" />
                <span className={cx("eyebrow text-[11px]", card.eyebrow)}>
                  {card.title}
                </span>
              </div>
              <p className="text-2xl font-medium tabular">
                {card.noun(dashboard.byGroup[group])}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-muted">
                {breakdown(group, dashboard.byStatus)}
              </p>
            </div>
            <span
              className={cx(
                "flex size-8 shrink-0 items-center justify-center rounded-full border",
                card.badge,
              )}
            >
              {card.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
