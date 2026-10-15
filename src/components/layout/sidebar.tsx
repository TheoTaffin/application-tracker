import { Bookmark, FileText, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Count, Dot } from "@/components/ui/badge";
import {
  STATUS_GROUP_LABEL,
  STATUS_GROUP_TONE,
  STATUS_GROUPS,
  type StatusGroup,
} from "@/lib/status";
import { loadNavCounts } from "@/server/queries";
import { NavLink } from "./nav-link";

const icon = "size-4 text-ink-subtle";

async function NavCount({ of }: { of: "resumes" | "contacts" | StatusGroup }) {
  const counts = await loadNavCounts();
  if (of === "resumes" || of === "contacts") {
    return (
      <span className="font-mono text-[10px] text-ink-subtle tabular">
        {counts[of]}
      </span>
    );
  }
  return <Count tone={STATUS_GROUP_TONE[of]}>{counts.groups[of]}</Count>;
}

async function TotalCount() {
  const { total } = await loadNavCounts();
  return (
    <span className="font-mono text-[10px] text-ink-subtle tabular">
      {total} total
    </span>
  );
}

/** Wraps a streamed count so the static shell renders without waiting for the database. */
function Streamed({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<span className="h-3 w-4 rounded bg-sand-200" />}>
      {children}
    </Suspense>
  );
}

function Links() {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      <span className="eyebrow px-2 pt-2 pb-1">Workspace</span>
      <NavLink href="/" icon={<LayoutDashboard className={icon} />}>
        Dashboard
      </NavLink>
      <NavLink
        href="/resumes"
        icon={<FileText className={icon} />}
        badge={
          <Streamed>
            <NavCount of="resumes" />
          </Streamed>
        }
      >
        Resumes
      </NavLink>
      <NavLink
        href="/contacts"
        icon={<Users className={icon} />}
        badge={
          <Streamed>
            <NavCount of="contacts" />
          </Streamed>
        }
      >
        Contacts
      </NavLink>

      <div className="flex items-center justify-between px-2 pt-5 pb-1">
        <span className="eyebrow">Status groups</span>
        <Streamed>
          <TotalCount />
        </Streamed>
      </div>
      {STATUS_GROUPS.map((group) => (
        <NavLink
          key={group}
          href={`/?group=${group}`}
          icon={<Dot tone={STATUS_GROUP_TONE[group]} className="size-2" />}
          badge={
            <Streamed>
              <NavCount of={group} />
            </Streamed>
          }
        >
          <span className="font-medium text-ink">
            {STATUS_GROUP_LABEL[group]}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-sand-300 bg-sand-150 lg:flex">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Link
          href="/"
          className="flex items-center gap-3 border-b border-sand-300 p-5"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-forest-800 text-sm font-medium text-sand-50 shadow-sm">
            AT
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight">
              Application Tracker
            </span>
            <span className="text-[11px] text-ink-subtle">
              Swiss job search
            </span>
          </span>
        </Link>
        <Suspense>
          <Links />
        </Suspense>
      </div>
      <div className="border-t border-sand-300 p-3">
        <Suspense>
          <NavLink href="/bookmarklet" icon={<Bookmark className={icon} />}>
            Save-to-tracker button
          </NavLink>
        </Suspense>
      </div>
    </aside>
  );
}

/** Compact navigation for small screens, where the sidebar is hidden. */
export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="flex items-center gap-4 overflow-x-auto border-b border-sand-300 bg-sand-150 px-4 py-2 text-xs font-medium lg:hidden"
    >
      <Link href="/" className="font-semibold text-forest-800">
        Application Tracker
      </Link>
      <Link href="/resumes" className="text-ink-muted">
        Resumes
      </Link>
      <Link href="/contacts" className="text-ink-muted">
        Contacts
      </Link>
    </nav>
  );
}
