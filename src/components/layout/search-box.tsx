import { Search } from "lucide-react";

/** Plain GET form: works without JavaScript and keeps the query in the URL. */
export function SearchBox({
  defaultValue,
  group,
}: {
  defaultValue?: string;
  group?: string;
}) {
  return (
    <form action="/" role="search" className="relative w-64">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-subtle" />
      {group && <input type="hidden" name="group" value={group} />}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search company or role…"
        aria-label="Search applications"
        className="h-8 w-full rounded border border-sand-300 bg-white pr-3 pl-8 text-xs shadow-sm placeholder:text-ink-subtle focus:border-forest-700 focus:outline-none"
      />
    </form>
  );
}
