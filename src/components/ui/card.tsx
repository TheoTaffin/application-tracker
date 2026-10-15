import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cx(
        "rounded-lg border border-sand-300 bg-paper shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cx(
        "flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <h2 className="text-base font-medium text-ink">{title}</h2>
          {description && (
            <p className="text-xs text-ink-subtle">{description}</p>
          )}
        </div>
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && (
        <div className="max-w-sm text-xs text-ink-subtle">{children}</div>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded bg-sand-200", className)} />;
}
