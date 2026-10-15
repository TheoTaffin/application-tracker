import { ArrowRight, BellRing } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { cx } from "@/lib/cx";
import { relativeDay } from "@/lib/format";
import {
  FOLLOW_UP_HORIZON_DAYS,
  type Dashboard,
} from "@/server/services/application-service";

const chip = {
  overdue: "border-terra-200 bg-terra-100 text-terra-700",
  today: "border-terra-200 bg-terra-100 text-terra-700",
  soon: "border-ochre-200 bg-ochre-100 text-ochre-700",
  later: "border-sand-300 bg-sand-100 text-ink-muted",
};

export function FollowUps({ dashboard }: { dashboard: Dashboard }) {
  const { followUps, today } = dashboard;
  if (followUps.length === 0) return null;

  return (
    <Card>
      <CardHeader
        icon={<BellRing className="size-[18px] text-terra-700" />}
        title="Upcoming follow-ups"
        description={`Overdue and due in the next ${FOLLOW_UP_HORIZON_DAYS * 24} hours.`}
        actions={
          <span className="font-mono text-xs text-ink-subtle">
            {followUps.length} {followUps.length === 1 ? "item" : "items"}
          </span>
        }
      />
      <ul className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {followUps.map((a) => {
          const due = relativeDay(a.nextActionAt!, today);
          return (
            <li
              key={a.id}
              className="flex flex-col justify-between rounded-lg border border-sand-300 bg-white p-4 shadow-sm transition-colors hover:border-sand-400"
            >
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={cx(
                      "rounded border px-2 py-0.5 font-mono text-[11px] font-medium",
                      chip[due.urgency],
                    )}
                  >
                    {due.label}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <h3 className="text-base font-semibold">{a.company}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">{a.role}</p>
                {a.nextActionNote && (
                  <p className="mt-3 border-t border-sand-200 pt-2.5 text-xs leading-relaxed text-ink">
                    {a.nextActionNote}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-sand-200 pt-2.5">
                <span className="text-[11px] text-ink-subtle">
                  {a.contactName
                    ? `Contact: ${a.contactName}`
                    : "No contact yet"}
                </span>
                <Link
                  href={`/applications/${a.id}#update`}
                  className="flex items-center gap-1 text-xs font-medium text-terra-700 hover:text-terra-800"
                >
                  Log update <ArrowRight className="size-3" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
