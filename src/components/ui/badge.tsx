import { cx } from "@/lib/cx";
import { isStatusKind, kindLabel, type StepKind } from "@/lib/steps";
import {
  STATUS_GROUP_LABEL,
  STATUS_GROUP_TONE,
  STATUS_LABEL,
  statusTone,
  type ApplicationStatus,
  type StatusGroup,
  type StatusTone,
} from "@/lib/status";

const pill: Record<StatusTone, string> = {
  amber: "bg-ochre-100 text-ochre-800 border-ochre-200",
  green: "bg-forest-100 text-forest-700 border-forest-200",
  red: "bg-terra-100 text-terra-800 border-terra-200",
  grey: "bg-sand-200 text-ink-muted border-sand-300",
};

export const dotColor: Record<StatusTone, string> = {
  amber: "bg-ochre-700",
  green: "bg-forest-600",
  red: "bg-terra-700",
  grey: "bg-ink-faint",
};

export function Dot({
  tone,
  className,
}: {
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "size-1.5 shrink-0 rounded-full",
        dotColor[tone],
        className,
      )}
    />
  );
}

function Pill({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap",
        pill[tone],
      )}
    >
      <Dot tone={tone} />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Pill tone={statusTone(status)}>{STATUS_LABEL[status]}</Pill>;
}

/** A step's kind: its status, or a neutral pill for an action (Reach out). */
export function StepKindBadge({ kind }: { kind: StepKind }) {
  if (isStatusKind(kind)) return <StatusBadge status={kind} />;
  return <Pill tone="grey">{kindLabel(kind)}</Pill>;
}

export function GroupBadge({ group }: { group: StatusGroup }) {
  return (
    <Pill tone={STATUS_GROUP_TONE[group]}>{STATUS_GROUP_LABEL[group]}</Pill>
  );
}

/** Small count chip, e.g. in navigation. */
export function Count({
  tone = "grey",
  children,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "rounded border px-1.5 font-mono text-[11px] font-medium tabular",
        pill[tone],
      )}
    >
      {children}
    </span>
  );
}
