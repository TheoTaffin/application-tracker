import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "@/lib/cx";

const control =
  "w-full rounded border border-sand-300 bg-white px-2.5 text-[13px] text-ink shadow-sm placeholder:text-ink-faint focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700 aria-[invalid=true]:border-terra-700";

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string[];
  className?: string;
  /** Receives the generated id and ARIA props to spread on the control. */
  children: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasError = Boolean(error?.length);
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": hasError || undefined,
        "aria-describedby": hasError || hint ? messageId : undefined,
      })}
      {hasError ? (
        <p id={messageId} className="text-[11px] text-terra-700">
          {error!.join(" ")}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[11px] text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(control, "h-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(control, "py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(control, "h-8 pr-7", className)} {...props} />;
}

export function Checkbox({
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink-muted">
      <input
        type="checkbox"
        className="size-4 rounded-[3px] border-sand-400 accent-forest-800"
        {...props}
      />
      {label}
    </label>
  );
}

/** Form-level error, e.g. from an ActionResult. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded border border-terra-200 bg-terra-50 px-3 py-2 text-xs text-terra-800"
    >
      {message}
    </p>
  );
}
