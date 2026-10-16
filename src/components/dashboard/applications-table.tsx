"use client";

import { Inbox, Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { cx } from "@/lib/cx";
import { formatDate, formatWorkload, relativeDay } from "@/lib/format";
import type { WorkspaceApplication } from "@/server/services/application-service";
import {
  FILTERS,
  SORTS,
  type DashboardState,
  type FilterKey,
} from "./url-state";

function CompanyMark({ name }: { name: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-forest-900 text-xs font-medium text-white">
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export function ApplicationsTable({
  applications,
  state,
  counts,
  today,
  selectedId,
  onChange,
  onOpen,
}: {
  applications: WorkspaceApplication[];
  state: DashboardState;
  counts: Record<FilterKey, number>;
  today: string;
  selectedId?: string;
  onChange: (change: Partial<DashboardState>) => void;
  /** Row activated (click or Enter). */
  onOpen: (id: string) => void;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-sand-300 bg-paper shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 p-3.5">
        <div
          role="group"
          aria-label="Filter applications"
          className="flex flex-wrap items-center gap-1.5"
        >
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.key}
              onClick={() => onChange({ filter: f.key })}
              aria-pressed={state.filter === f.key}
              className={buttonClass(
                state.filter === f.key ? "primary" : "secondary",
                "sm",
                "font-normal",
              )}
            >
              {f.label}{" "}
              <span className="tabular opacity-70">({counts[f.key]})</span>
            </button>
          ))}
        </div>
        <div className="relative w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={state.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search company or role…"
            aria-label="Search applications"
            className="h-7 w-full rounded border border-sand-300 bg-white pr-2 pl-8 text-xs shadow-sm placeholder:text-ink-subtle focus:border-forest-700 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-1 border-b border-sand-200 px-3.5 py-2 text-xs text-ink-subtle">
        Sort by
        {SORTS.map((s) => (
          <button
            type="button"
            key={s.key}
            onClick={() => onChange({ sort: s.key })}
            aria-pressed={state.sort === s.key}
            className={cx(
              "rounded px-1.5 py-0.5",
              state.sort === s.key
                ? "bg-sand-200 font-medium text-ink"
                : "hover:text-ink",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-8" />}
          title={state.q ? "No matches" : "Nothing here"}
        >
          {state.q ? (
            <>No application matches “{state.q}”.</>
          ) : (
            <>
              Add an application with <strong>+ Add application</strong>.
            </>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-sand-300 bg-sand-200/50 font-mono text-[10px] tracking-wider text-ink-subtle uppercase">
                <th className="px-4 py-2.5 font-semibold">Company</th>
                <th className="px-3 py-2.5 font-semibold">Position</th>
                <th className="px-3 py-2.5 font-semibold">Location</th>
                <th className="px-3 py-2.5 font-semibold">Current stage</th>
                <th className="px-3 py-2.5 font-semibold">Next action</th>
                <th className="px-3 py-2.5 text-right font-semibold">
                  Applied
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {applications.map((a) => {
                const selected = a.id === selectedId;
                const due = a.nextActionAt
                  ? relativeDay(a.nextActionAt, today)
                  : null;
                const workload = formatWorkload(a.workloadMin, a.workloadMax);
                return (
                  <tr
                    key={a.id}
                    onClick={() => onOpen(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpen(a.id);
                      }
                    }}
                    tabIndex={0}
                    aria-selected={selected}
                    className={cx(
                      "cursor-pointer transition-colors focus-visible:outline-offset-[-2px]",
                      selected
                        ? "bg-sand-50 shadow-[inset_2px_0_0_var(--color-forest-800)]"
                        : "hover:bg-sand-50/70",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <CompanyMark name={a.company} />
                        <div>
                          <span className="block text-sm leading-tight font-semibold">
                            {a.company}
                          </span>
                          {a.contactName && (
                            <span className="text-[10px] text-ink-subtle">
                              {a.contactName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium">{a.role}</span>
                      {workload && (
                        <span className="text-[10px] text-ink-subtle tabular">
                          {workload}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">
                      {a.location ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={a.status} />
                      {a.activeStage && (
                        <span className="mt-1 block max-w-[14rem] truncate text-[10px] text-ink-subtle">
                          {a.activeStage.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {due ? (
                        <>
                          <span className="block font-medium">
                            {a.nextActionNote || "Next step"}
                          </span>
                          <span
                            className={cx(
                              "text-[10px]",
                              due.urgency === "overdue" ||
                                due.urgency === "today"
                                ? "font-medium text-terra-700"
                                : "text-ink-subtle",
                            )}
                          >
                            {due.label}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[11px] text-ink-subtle">
                      {formatDate(a.appliedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-sand-200 bg-sand-100/60 p-3 text-xs text-ink-muted">
        <span>
          {applications.length}{" "}
          {applications.length === 1 ? "application" : "applications"}
          {state.q && <> matching “{state.q}”</>}
        </span>
        {state.filter !== "closed" && counts.closed > 0 && (
          <button
            type="button"
            onClick={() => onChange({ filter: "closed" })}
            className="font-medium text-ink hover:underline"
          >
            View closed ({counts.closed}) →
          </button>
        )}
      </div>
    </section>
  );
}
