import { Mail, PenLine } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/format";
import type { StatusEventDTO } from "@/server/services/dto";

/** Status history, newest first. The first entry is the current status. */
export function Timeline({
  events,
  compact = false,
}: {
  events: StatusEventDTO[];
  compact?: boolean;
}) {
  return (
    <ol className="relative space-y-3.5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-forest-200">
      {events.map((event, i) => {
        const current = i === 0;
        return (
          <li
            key={event.id}
            className={cx(
              "relative",
              current &&
                "rounded-md border border-forest-200 bg-white p-2.5 shadow-sm",
            )}
          >
            <span
              aria-hidden
              className={cx(
                "absolute -left-6 size-4 rounded-full ring-4 ring-paper",
                current ? "top-3 bg-forest-600" : "top-1 bg-forest-200",
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={event.status} />
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-subtle">
                {event.source === "gmail" ? (
                  <Mail className="size-3" aria-label="From email" />
                ) : (
                  <PenLine className="size-3" aria-label="Manual" />
                )}
                <time dateTime={new Date(event.occurredAt).toISOString()}>
                  {formatDate(event.occurredAt, !compact)}
                </time>
              </span>
            </div>
            {event.note && (
              <p className="mt-1 text-[11px] leading-relaxed whitespace-pre-line text-ink-muted">
                {event.note}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
