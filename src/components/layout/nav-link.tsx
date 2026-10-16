"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Sidebar link that highlights itself for the current route (and `group` filter). */
export function NavLink({
  href,
  icon,
  badge,
  children,
}: {
  href: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = new URL(href, "http://x");
  const group = url.searchParams.get("group");
  const active =
    pathname === url.pathname &&
    (group
      ? searchParams.get("group") === group
      : !searchParams.get("group") || url.pathname !== "/");

  return (
    <Link
      href={href}
      onClick={(e) => {
        // On the dashboard, filters change in place (no navigation, no reload).
        if (
          pathname === "/" &&
          url.pathname === "/" &&
          !e.metaKey &&
          !e.ctrlKey
        ) {
          e.preventDefault();
          const next = new URLSearchParams(searchParams);
          if (group) next.set("group", group);
          else next.delete("group");
          next.delete("selected");
          const query = next.toString();
          window.history.pushState(null, "", query ? `/?${query}` : "/");
        }
      }}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center justify-between rounded-md px-3 py-1.5 text-xs transition-colors",
        active
          ? "border border-sand-300 bg-white font-semibold text-forest-800 shadow-sm"
          : "border border-transparent text-ink-muted hover:bg-white/70 hover:text-ink",
      )}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        {children}
      </span>
      {badge}
    </Link>
  );
}
