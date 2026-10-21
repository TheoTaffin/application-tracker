"use client";

import { Check, Loader2, Mail, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { StepKindBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/format";
import {
  currentStep,
  nextStep,
  sortSteps,
  stepLabel,
  type StepKind,
} from "@/lib/steps";
import {
  addStepAction,
  completeStepAction,
  deleteStepAction,
  updateStepAction,
} from "@/server/actions/progress";
import type { StepDTO } from "@/server/services/dto";
import { emptyStep, StepFields, type StepValues } from "./step-fields";

function toValues(step: StepDTO): StepValues {
  return {
    kind: step.kind,
    title: step.title ?? "",
    state: step.state,
    date: step.date ?? "",
    note: step.note ?? "",
  };
}

/** Add or edit one step, in a dialog. */
function StepDialog({
  applicationId,
  step,
  defaultKind,
  open,
  onClose,
}: {
  applicationId: string;
  step?: StepDTO;
  defaultKind?: StepKind;
  open: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState<StepValues>(() =>
    step ? toValues(step) : emptyStep(defaultKind),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = step
        ? await updateStepAction(step.id, values)
        : await addStepAction(applicationId, values);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      onClose();
    });
  };

  const remove = () =>
    start(async () => {
      if (!step || !window.confirm(`Delete the step “${stepLabel(step)}”?`))
        return;
      const result = await deleteStepAction(step.id);
      if (!result.ok) return setError(result.error);
      onClose();
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={step ? "Edit step" : "Add a step"}
    >
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <StepFields values={values} onChange={setValues} errors={fieldErrors} />
        <div className="flex items-center justify-between gap-2">
          {step ? (
            <Button
              variant="danger"
              size="sm"
              onClick={remove}
              disabled={pending}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {step ? "Save step" : "Add step"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/** Opens the "add a step" dialog; used in the side panel and on follow-up cards. */
export function AddStepButton({
  applicationId,
  defaultKind,
  variant = "secondary",
  className,
  label = "Add step",
}: {
  applicationId: string;
  defaultKind?: StepKind;
  variant?: "secondary" | "primary" | "ghost";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" /> {label}
      </Button>
      {open && (
        <StepDialog
          applicationId={applicationId}
          defaultKind={defaultKind}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Completes a planned step today: how a planned step gets validated. */
export function MarkDoneButton({
  stepId,
  variant = "secondary",
  className,
}: {
  stepId: string;
  variant?: "secondary" | "primary" | "ghost";
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        className={className}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await completeStepAction(stepId);
            setError(result.ok ? null : result.error);
          })
        }
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        Mark done
      </Button>
      {error && <FormError message={error} />}
    </>
  );
}

/** Opens the edit dialog of one step (e.g. to reschedule a planned step). */
export function EditStepButton({
  applicationId,
  step,
  variant = "ghost",
  className,
}: {
  applicationId: string;
  step: StepDTO;
  variant?: "secondary" | "primary" | "ghost";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" /> Edit
      </Button>
      {open && (
        <StepDialog
          applicationId={applicationId}
          step={step}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Marker({ step }: { step: StepDTO }) {
  const base =
    "absolute top-0.5 -left-6 flex size-4 items-center justify-center rounded-full ring-4 ring-paper";
  if (step.state === "planned")
    return <span className={cx(base, "border-2 border-sand-400 bg-paper")} />;
  if (step.state === "cancelled")
    return (
      <span className={cx(base, "bg-sand-300 text-ink-subtle")}>
        <X className="size-2.5" strokeWidth={3} />
      </span>
    );
  return (
    <span className={cx(base, "bg-forest-600 text-white")}>
      <Check className="size-2.5" strokeWidth={3} />
    </span>
  );
}

/**
 * The application's timeline, in date order, with the next planned step highlighted.
 * The status is shown with the application, not here: an action done after the
 * latest status change would make any "current" marker look misplaced.
 * Click a step to edit it.
 */
export function StepTimeline({
  applicationId,
  steps,
  compact = false,
}: {
  applicationId: string;
  steps: StepDTO[];
  compact?: boolean;
}) {
  const [editing, setEditing] = useState<StepDTO | null>(null);
  const ordered = sortSteps(steps);
  const upcoming = nextStep(ordered);
  const done = ordered.filter((s) => s.state === "done").length;
  const planned = ordered.filter((s) => s.state === "planned").length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="eyebrow">Steps</span>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-forest-200 bg-forest-100 px-2 py-0.5 font-mono text-[10px] text-forest-800">
            {done} done{planned > 0 && ` · ${planned} planned`}
          </span>
          <AddStepButton
            applicationId={applicationId}
            defaultKind={currentStep(ordered)?.kind}
            variant="ghost"
            className="h-7 px-2"
            label={compact ? "" : "Add step"}
          />
        </div>
      </div>

      <ol className="relative space-y-3 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-forest-200">
        {ordered.map((step) => {
          const isNext = step.id === upcoming?.id;
          return (
            <li
              key={step.id}
              className={cx(
                "relative",
                step.state === "cancelled" && "opacity-60",
              )}
            >
              <Marker step={step} />
              <button
                type="button"
                onClick={() => setEditing(step)}
                className="block w-full text-left"
                aria-label={`Edit step ${stepLabel(step)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <StepKindBadge kind={step.kind} />
                    {step.title && (
                      <span
                        className={cx(
                          "text-xs font-medium",
                          step.state === "cancelled" && "line-through",
                        )}
                      >
                        {step.title}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-ink-subtle">
                    {step.source === "gmail" && (
                      <Mail className="size-3" aria-label="From email" />
                    )}
                    {isNext && (
                      <span className="rounded border border-ochre-200 bg-ochre-100 px-1.5 text-ochre-800">
                        Next
                      </span>
                    )}
                    {step.date
                      ? formatDate(step.date, !compact)
                      : step.state === "planned"
                        ? "No date"
                        : ""}
                  </span>
                </div>
                {step.note && (
                  <p className="mt-1 text-[11px] leading-relaxed whitespace-pre-line text-ink-muted">
                    {step.note}
                  </p>
                )}
              </button>
              {step.state === "planned" && (
                <MarkDoneButton
                  stepId={step.id}
                  className="mt-1.5 h-6 px-2 text-[11px]"
                />
              )}
            </li>
          );
        })}
      </ol>

      {editing && (
        <StepDialog
          key={editing.id}
          applicationId={applicationId}
          step={editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
