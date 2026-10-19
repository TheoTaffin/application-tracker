"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { STEP_STATES, type StepState } from "@/lib/enums";
import { todayInAppTimeZone } from "@/lib/dates";
import { APPLICATION_STATUSES, STATUS_LABEL } from "@/lib/status";
import { STEP_ACTION_LABEL, STEP_ACTIONS, type StepKind } from "@/lib/steps";

export interface StepValues {
  kind: StepKind;
  title: string;
  state: StepState;
  date: string;
  note: string;
}

export const STEP_STATE_LABEL: Record<StepState, string> = {
  done: "Done",
  planned: "Planned",
  cancelled: "Cancelled",
};

export function emptyStep(kind: StepKind = "applied"): StepValues {
  return {
    kind,
    title: "",
    state: "done",
    date: todayInAppTimeZone(),
    note: "",
  };
}

/** The fields of one step, shared by the step dialog and the new-application form. */
export function StepFields({
  values,
  onChange,
  errors = {},
  withNote = true,
}: {
  values: StepValues;
  onChange: (values: StepValues) => void;
  /** Keyed by field name (kind, title, state, date, note). */
  errors?: Record<string, string[] | undefined>;
  withNote?: boolean;
}) {
  const set = <K extends keyof StepValues>(key: K, value: StepValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.1fr_1.6fr_0.9fr_1fr]">
      <Field label="Step" error={errors.kind}>
        {(p) => (
          <Select
            {...p}
            value={values.kind}
            onChange={(e) => set("kind", e.target.value as StepKind)}
          >
            <optgroup label="Status change">
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Action (keeps the status)">
              {STEP_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {STEP_ACTION_LABEL[a]}
                </option>
              ))}
            </optgroup>
          </Select>
        )}
      </Field>
      <Field label="Name (optional)" error={errors.title}>
        {(p) => (
          <Input
            {...p}
            placeholder={
              values.kind === "reach_out"
                ? "Ping the recruiter…"
                : "Technical round with Lukas…"
            }
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
          />
        )}
      </Field>
      <Field label="State" error={errors.state}>
        {(p) => (
          <Select
            {...p}
            value={values.state}
            onChange={(e) => set("state", e.target.value as StepState)}
          >
            {STEP_STATES.map((s) => (
              <option key={s} value={s}>
                {STEP_STATE_LABEL[s]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label={values.state === "planned" ? "Planned for" : "Date"}
        error={errors.date}
      >
        {(p) => (
          <Input
            {...p}
            type="date"
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
          />
        )}
      </Field>
      {withNote && (
        <Field
          label="Note"
          className="col-span-2 sm:col-span-4"
          error={errors.note}
        >
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              placeholder="With whom, how it went, what to prepare…"
              value={values.note}
              onChange={(e) => set("note", e.target.value)}
            />
          )}
        </Field>
      )}
    </div>
  );
}
