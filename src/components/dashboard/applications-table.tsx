import { Inbox } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { cx } from "@/lib/cx";
import { formatDate, formatWorkload, relativeDay } from "@/lib/format";
import type { ApplicationSummary } from "@/server/services/application-service";

export const FILTERS = [
  { key: "open", label: "All open" },
  { key: "pending", label: "Pending" },
  { key: "ongoing", label: "On-going" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "Everything" },
] as const;
export type FilterKey = (typeof FILTERS)[number]["key"];

export const SORTS = [
  { key: "next_action", label: "Next action" },
  { key: "updated", label: "Recently updated" },
  { key: "applied", label: "Applied" },
  { key: "company", label: "Company" },
] as const;
export type SortKey = (typeof SORTS)[number]["key"];

export interface TableState {
  filter: FilterKey;
  sort: SortKey;
  q?: string;
  selected?: string;
}

/** Dashboard URL for a state change, keeping the other parameters. */
export function dashboardHref(state: TableState, change: Partial<TableState>) {
  const next = { ...state, ...change };
  const params = new URLSearchParams();
  if (next.filter !== "open") params.set("group", next.filter);
  if (next.sort !== "next_action") params.set("sort", next.sort);
  if (next.q) params.set("q", next.q);
  if (next.selected) params.set("selected", next.selected);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

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
}: {
  applications: ApplicationSummary[];
  state: TableState;
  counts: Record<FilterKey, number>;
  today: string;
  selectedId?: string;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-sand-300 bg-paper shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 p-3.5">
        <nav
          aria-label="Filter applications"
          className="flex flex-wrap items-center gap-1.5"
        >
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={dashboardHref(state, {
                filter: f.key,
                selected: undefined,
              })}
              aria-current={state.filter === f.key ? "page" : undefined}
              className={buttonClass(
                state.filter === f.key ? "primary" : "secondary",
                "sm",
                "font-normal",
              )}
            >
              {f.label}{" "}
              <span className="tabular opacity-70">({counts[f.key]})</span>
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Sort applications"
          className="flex items-center gap-1 text-xs text-ink-subtle"
        >
          Sort:
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={dashboardHref(state, { sort: s.key })}
              aria-current={state.sort === s.key ? "true" : undefined}
              className={cx(
                "rounded px-1.5 py-0.5",
                state.sort === s.key
                  ? "bg-sand-200 font-medium text-ink"
                  : "hover:text-ink",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-8" />}
          title={state.q ? "No matches" : "Nothing here yet"}
        >
          {state.q ? (
            <>No application matches “{state.q}”.</>
          ) : (
            <>
              Add your first application with <strong>+ Add application</strong>
              .
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
                <th className="px-3 py-2.5 font-semibold">Status</th>
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
                    className={cx(
                      "relative transition-colors",
                      selected
                        ? "bg-sand-50 shadow-[inset_2px_0_0_var(--color-forest-800)]"
                        : "hover:bg-sand-50/70",
                    )}
                  >
                    <td className="px-4 py-3">
                      {/* Wide screens: select into the side panel. Narrow: open the page. */}
                      <Link
                        href={dashboardHref(state, { selected: a.id })}
                        scroll={false}
                        className="absolute inset-0 hidden xl:block"
                        aria-label={`Show ${a.company} in the side panel`}
                      />
                      <Link
                        href={`/applications/${a.id}`}
                        className="absolute inset-0 xl:hidden"
                        aria-label={`Open ${a.company}`}
                      />
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
          <Link
            href={dashboardHref(state, {
              filter: "closed",
              selected: undefined,
            })}
            className="font-medium text-ink hover:underline"
          >
            View closed ({counts.closed}) →
          </Link>
        )}
      </div>
    </section>
  );
}
