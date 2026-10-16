"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

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

export interface DashboardState {
  filter: FilterKey;
  sort: SortKey;
  q: string;
  selected: string | null;
}

/**
 * Dashboard view state lives in the URL (shareable, survives reloads), but changes go
 * through the History API instead of a navigation: Next.js keeps useSearchParams in
 * sync, and nothing is fetched from the server.
 */
export function useDashboardState() {
  const params = useSearchParams();
  const filter = params.get("group");
  const sort = params.get("sort");
  const state: DashboardState = {
    filter: FILTERS.some((f) => f.key === filter)
      ? (filter as FilterKey)
      : "open",
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "next_action",
    q: params.get("q") ?? "",
    selected: params.get("selected"),
  };

  const update = useCallback(
    (change: Partial<DashboardState>) => {
      const next = new URLSearchParams(params);
      const set = (
        key: string,
        value: string | null | undefined,
        fallback?: string,
      ) => {
        if (!value || value === fallback) next.delete(key);
        else next.set(key, value);
      };
      if ("filter" in change) set("group", change.filter, "open");
      if ("sort" in change) set("sort", change.sort, "next_action");
      if ("q" in change) set("q", change.q);
      if ("selected" in change) set("selected", change.selected);
      const query = next.toString();
      window.history.replaceState(null, "", query ? `/?${query}` : "/");
    },
    [params],
  );

  return [state, update] as const;
}
