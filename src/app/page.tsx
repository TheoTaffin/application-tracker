import { connection } from "next/server";
import { Suspense } from "react";
import { AddApplicationButton } from "@/components/applications/add-application-button";
import { DashboardWorkspace } from "@/components/dashboard/workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/card";
import { getWorkspace } from "@/server/services/application-service";

async function Dashboard() {
  await connection();
  const workspace = await getWorkspace();
  return <DashboardWorkspace workspace={workspace} />;
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

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="Every application, its status and what comes next."
        actions={
          <Suspense>
            <AddApplicationButton />
          </Suspense>
        }
      />
      <main className="flex-1 space-y-6 p-4 md:p-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />
        </Suspense>
      </main>
    </>
  );
}
