import { Plus } from "lucide-react";
import { Suspense } from "react";
import {
  ApplicationsTable,
  FILTERS,
  SORTS,
  type FilterKey,
  type SortKey,
  type TableState,
} from "@/components/dashboard/applications-table";
import { FollowUps } from "@/components/dashboard/follow-ups";
import { GroupCards } from "@/components/dashboard/group-cards";
import { Inspector } from "@/components/dashboard/inspector";
import { PageHeader } from "@/components/layout/page-header";
import { SearchBox } from "@/components/layout/search-box";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import { APPLICATION_STATUSES, statusGroup } from "@/lib/status";
import { loadDashboard } from "@/server/queries";
import {
  getApplication,
  listApplications,
} from "@/server/services/application-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function parseState(params: Awaited<SearchParams>): TableState {
  const group = one(params.group);
  const sort = one(params.sort);
  return {
    filter: FILTERS.some((f) => f.key === group)
      ? (group as FilterKey)
      : "open",
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "next_action",
    q: one(params.q)?.trim() || undefined,
    selected: one(params.selected),
  };
}

const OPEN_STATUSES = APPLICATION_STATUSES.filter(
  (s) => statusGroup(s) !== "closed",
);

async function DashboardContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const state = parseState(await searchParams);
  const dashboard = await loadDashboard();
  const applications = await listApplications({
    group:
      state.filter === "pending" ||
      state.filter === "ongoing" ||
      state.filter === "closed"
        ? state.filter
        : undefined,
    statuses: state.filter === "open" ? [...OPEN_STATUSES] : undefined,
    search: state.q,
    sort: state.sort,
  });
  const { pending, ongoing, closed } = dashboard.byGroup;
  const counts = {
    open: pending + ongoing,
    pending,
    ongoing,
    closed,
    all: dashboard.total,
  };

  const selectedId = applications.some((a) => a.id === state.selected)
    ? state.selected
    : applications[0]?.id;
  const selected = selectedId ? await getApplication(selectedId) : null;

  return (
    <>
      <GroupCards dashboard={dashboard} />
      <FollowUps dashboard={dashboard} />
      <div className="flex items-start gap-6">
        <ApplicationsTable
          applications={applications}
          state={state}
          counts={counts}
          today={dashboard.today}
          selectedId={selected?.id}
        />
        {selected && (
          <Inspector application={selected} today={dashboard.today} />
        )}
      </div>
    </>
  );
}

async function HeaderSearch({ searchParams }: { searchParams: SearchParams }) {
  const state = parseState(await searchParams);
  return (
    <SearchBox
      defaultValue={state.q}
      group={state.filter === "open" ? undefined : state.filter}
    />
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </>
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="Every application, its status and what comes next."
        actions={
          <>
            <Suspense fallback={<SearchBox />}>
              <HeaderSearch searchParams={searchParams} />
            </Suspense>
            <ButtonLink href="/?new" variant="primary" scroll={false}>
              <Plus className="size-3.5" /> Add application
            </ButtonLink>
          </>
        }
      />
      <main className="flex-1 space-y-6 p-4 md:p-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
