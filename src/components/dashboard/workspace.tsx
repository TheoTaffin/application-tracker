"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { FOLLOW_UP_HORIZON_DAYS } from "@/lib/constants";
import type {
  Workspace,
  WorkspaceApplication,
} from "@/server/services/application-service";
import { ApplicationsTable } from "./applications-table";
import { FollowUps } from "./follow-ups";
import { GroupCards } from "./group-cards";
import { SidePanel } from "./side-panel";
import {
  useDashboardState,
  type DashboardState,
  type FilterKey,
  type SortKey,
} from "./url-state";

function matchesFilter(a: WorkspaceApplication, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "open") return a.statusGroup !== "closed";
  return a.statusGroup === filter;
}

/** Same rules as the server-side list, applied in the browser for instant changes. */
function compare(sort: SortKey) {
  const text = (x: string | null, y: string | null) =>
    (x ?? "").localeCompare(y ?? "");
  switch (sort) {
    case "next_action":
      // Soonest first; applications without a next action go last.
      return (a: WorkspaceApplication, b: WorkspaceApplication) =>
        (a.nextActionAt ? 0 : 1) - (b.nextActionAt ? 0 : 1) ||
        text(a.nextActionAt, b.nextActionAt) ||
        text(a.company, b.company);
    case "applied":
      return (a: WorkspaceApplication, b: WorkspaceApplication) =>
        text(b.appliedAt, a.appliedAt);
    case "company":
      return (a: WorkspaceApplication, b: WorkspaceApplication) =>
        text(a.company, b.company) || text(a.role, b.role);
    case "updated":
      return (a: WorkspaceApplication, b: WorkspaceApplication) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }
}

function visible(all: WorkspaceApplication[], state: DashboardState) {
  const q = state.q.trim().toLocaleLowerCase();
  return all
    .filter((a) => matchesFilter(a, state.filter))
    .filter(
      (a) =>
        !q ||
        a.company.toLocaleLowerCase().includes(q) ||
        a.role.toLocaleLowerCase().includes(q),
    )
    .sort(compare(state.sort));
}

/**
 * The whole dashboard, interactive in the browser: filters, sorting, search and the
 * selected application only change URL parameters (no server round-trip). The server
 * re-renders the data only after a change is saved.
 */
export function DashboardWorkspace({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const [state, update] = useDashboardState();
  const { dashboard, applications, options } = workspace;

  const rows = useMemo(
    () => visible(applications, state),
    [applications, state],
  );
  const followUps = useMemo(() => {
    const ids = new Set(dashboard.followUps.map((f) => f.id));
    return applications
      .filter((a) => ids.has(a.id))
      .sort((a, b) => a.nextActionAt!.localeCompare(b.nextActionAt!));
  }, [applications, dashboard.followUps]);

  const { pending, ongoing, closed } = dashboard.byGroup;
  const counts = {
    open: pending + ongoing,
    pending,
    ongoing,
    closed,
    all: dashboard.total,
  };
  // The panel follows what the table shows: a selection hidden by filters gives way.
  const selected = rows.find((a) => a.id === state.selected) ?? rows[0];

  const open = (id: string) => {
    // Wide screens show the side panel; narrow ones go to the application page.
    if (window.matchMedia("(min-width: 1280px)").matches)
      update({ selected: id });
    else router.push(`/applications/${id}`);
  };

  return (
    <>
      <GroupCards
        dashboard={dashboard}
        active={state.filter}
        onSelect={(group) =>
          update({ filter: state.filter === group ? "open" : group })
        }
      />
      <FollowUps
        items={followUps}
        today={dashboard.today}
        hours={FOLLOW_UP_HORIZON_DAYS * 24}
        options={options}
        onSelect={open}
      />
      <div className="flex items-start gap-6">
        <ApplicationsTable
          applications={rows}
          state={state}
          counts={counts}
          today={dashboard.today}
          selectedId={selected?.id}
          onChange={update}
          onOpen={open}
        />
        {selected && (
          <SidePanel
            key={selected.id}
            application={selected}
            today={dashboard.today}
            options={options}
          />
        )}
      </div>
    </>
  );
}
