"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Field,
  FormError,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { cx } from "@/lib/cx";
import { STAGE_STATES, type StageState } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import {
  addStageAction,
  deleteStageAction,
  moveStageAction,
  updateStageAction,
} from "@/server/actions/progress";
import type { StageDTO } from "@/server/services/dto";

export const STAGE_STATE_LABEL: Record<StageState, string> = {
  planned: "Planned",
  active: "Current",
  passed: "Passed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function Marker({ state }: { state: StageState }) {
  const base =
    "absolute -left-6 top-0.5 flex size-4 items-center justify-center rounded-full ring-4 ring-paper";
  if (state === "passed")
    return (
      <span className={cx(base, "bg-forest-600 text-white")}>
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  if (state === "failed")
    return (
      <span className={cx(base, "bg-terra-700 text-white")}>
        <X className="size-2.5" strokeWidth={3} />
      </span>
    );
  if (state === "active")
    return <span className={cx(base, "bg-forest-600 ring-forest-200")} />;
  return <span className={cx(base, "border-2 border-sand-400 bg-paper")} />;
}

function StageForm({
  applicationId,
  stage,
  onDone,
}: {
  applicationId: string;
  stage?: StageDTO;
  onDone: () => void;
}) {
  const [values, setValues] = useState({
    name: stage?.name ?? "",
    state: stage?.state ?? ("planned" as StageState),
    date: stage?.date ?? "",
    note: stage?.note ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = stage
        ? await updateStageAction(stage.id, values)
        : await addStageAction(applicationId, values);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      onDone();
    });
  };

  const remove = () =>
    start(async () => {
      if (!stage || !window.confirm(`Delete the stage “${stage.name}”?`))
        return;
      const result = await deleteStageAction(stage.id);
      if (!result.ok) return setError(result.error);
      onDone();
    });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <FormError message={error} />
      <Field label="Stage" error={fieldErrors.name}>
        {(p) => (
          <Input
            {...p}
            autoFocus
            placeholder="Recruiter screen, Technical round, Leadership panel…"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="State" error={fieldErrors.state}>
          {(p) => (
            <Select
              {...p}
              value={values.state}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  state: e.target.value as StageState,
                }))
              }
            >
              {STAGE_STATES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_STATE_LABEL[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Date"
          hint="Scheduled or held on"
          error={fieldErrors.date}
        >
          {(p) => (
            <Input
              {...p}
              type="date"
              value={values.date}
              onChange={(e) =>
                setValues((v) => ({ ...v, date: e.target.value }))
              }
            />
          )}
        </Field>
      </div>
      <Field label="Note" error={fieldErrors.note}>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            placeholder="With whom, how it went, what to prepare…"
            value={values.note}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          />
        )}
      </Field>
      <div className="flex items-center justify-between gap-2">
        {stage ? (
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
          <Button onClick={onDone}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {stage ? "Save stage" : "Add stage"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** The application's own process steps as a stepper, editable in place. */
export function StageProgress({
  applicationId,
  stages,
  compact = false,
}: {
  applicationId: string;
  stages: StageDTO[];
  compact?: boolean;
}) {
  const [editing, setEditing] = useState<StageDTO | "new" | null>(null);
  const [moving, startMove] = useTransition();
  const counted = stages.filter((s) => s.state !== "cancelled");
  const passed = counted.filter((s) => s.state === "passed").length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="eyebrow">Stages</span>
        <div className="flex items-center gap-1.5">
          {counted.length > 0 && (
            <span className="rounded-full border border-forest-200 bg-forest-100 px-2 py-0.5 font-mono text-[10px] text-forest-800">
              {passed} of {counted.length} passed
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing("new")}
            aria-label="Add a stage"
          >
            <Plus className="size-3.5" />
            {!compact && "Add stage"}
          </Button>
        </div>
      </div>

      {stages.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="w-full rounded-md border border-dashed border-sand-400 px-3 py-4 text-center text-xs text-ink-subtle hover:border-forest-700 hover:text-ink"
        >
          Map out the process: add the stages you know (screening, interviews,
          case study…)
        </button>
      ) : (
        <ol className="relative space-y-3 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-forest-200">
          {stages.map((stage, i) => {
            const active = stage.state === "active";
            return (
              <li
                key={stage.id}
                className={cx(
                  "group relative",
                  active &&
                    "rounded-md border border-forest-200 bg-white p-2.5 shadow-sm",
                  stage.state === "cancelled" && "opacity-60",
                )}
              >
                <Marker state={stage.state} />
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(stage)}
                    className={cx(
                      "text-left text-xs font-medium hover:underline",
                      active && "font-semibold text-forest-900",
                      stage.state === "cancelled" && "line-through",
                    )}
                  >
                    {stage.name}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {active && (
                      <span className="rounded border border-forest-200 bg-forest-100 px-1.5 font-mono text-[10px] text-forest-700">
                        Current
                      </span>
                    )}
                    {stage.date && (
                      <span className="font-mono text-[10px] text-ink-subtle">
                        {formatDate(stage.date)}
                      </span>
                    )}
                    <span className="hidden items-center group-focus-within:flex group-hover:flex">
                      <button
                        type="button"
                        disabled={moving || i === 0}
                        onClick={() =>
                          startMove(
                            async () =>
                              void (await moveStageAction(stage.id, "up")),
                          )
                        }
                        className="rounded p-0.5 text-ink-subtle hover:bg-sand-200 disabled:opacity-30"
                        aria-label={`Move ${stage.name} up`}
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={moving || i === stages.length - 1}
                        onClick={() =>
                          startMove(
                            async () =>
                              void (await moveStageAction(stage.id, "down")),
                          )
                        }
                        className="rounded p-0.5 text-ink-subtle hover:bg-sand-200 disabled:opacity-30"
                        aria-label={`Move ${stage.name} down`}
                      >
                        <ArrowDown className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(stage)}
                        className="rounded p-0.5 text-ink-subtle hover:bg-sand-200"
                        aria-label={`Edit ${stage.name}`}
                      >
                        <Pencil className="size-3" />
                      </button>
                    </span>
                  </div>
                </div>
                {/* The current stage already has its badge; others say where they stand. */}
                {(!active || stage.note) && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                    {[!active && STAGE_STATE_LABEL[stage.state], stage.note]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add a stage" : "Edit stage"}
      >
        {editing !== null && (
          <StageForm
            applicationId={applicationId}
            stage={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
