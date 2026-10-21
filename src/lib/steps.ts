import type { StepState } from "./enums";
import {
  APPLICATION_STATUSES,
  STATUS_LABEL,
  type ApplicationStatus,
} from "./status";

/**
 * Rules of the steps timeline, shared by server (summaries, follow-ups) and client
 * (timeline display). Nothing here is stored: everything derives from the steps.
 *
 * A step is either a status change (Applied, Interview 1…), which moves the
 * application forward, or an action (Reach out…), which happens without changing
 * the status.
 */

export const STEP_ACTIONS = ["reach_out"] as const;
export type StepAction = (typeof STEP_ACTIONS)[number];

export const STEP_KINDS = [...APPLICATION_STATUSES, ...STEP_ACTIONS] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export const STEP_ACTION_LABEL: Record<StepAction, string> = {
  reach_out: "Reach out",
};

export function isStatusKind(kind: StepKind): kind is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(kind);
}

export function kindLabel(kind: StepKind): string {
  return isStatusKind(kind) ? STATUS_LABEL[kind] : STEP_ACTION_LABEL[kind];
}

export interface StepLike {
  kind: StepKind;
  title: string | null;
  state: StepState;
  /** YYYY-MM-DD; may be null for planned or cancelled steps. */
  date: string | null;
  createdAt: Date | string;
}

const time = (d: Date | string) => new Date(d).getTime();

/** Chronological: by date (undated last), then by when the step was recorded. */
export function compareSteps(a: StepLike, b: StepLike): number {
  if (a.date !== b.date) {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date < b.date ? -1 : 1;
  }
  return time(a.createdAt) - time(b.createdAt);
}

export function sortSteps<T extends StepLike>(steps: readonly T[]): T[] {
  return [...steps].sort(compareSteps);
}

/** Does this step define the status? Only status changes that happened do. */
export function setsStatus(step: Pick<StepLike, "kind" | "state">): boolean {
  return step.state === "done" && isStatusKind(step.kind);
}

/** The latest status change that happened: it defines the application's status. */
export function currentStep<T extends StepLike>(
  steps: readonly T[],
): T | undefined {
  return sortSteps(steps.filter(setsStatus)).at(-1);
}

/** The earliest upcoming step (status change or action): what to do next. */
export function nextStep<T extends StepLike>(
  steps: readonly T[],
): T | undefined {
  return sortSteps(steps.filter((s) => s.state === "planned"))[0];
}

/** When I applied: the first "applied" step, else the first status change. */
export function appliedDate(steps: readonly StepLike[]): string | null {
  const done = sortSteps(steps.filter(setsStatus));
  return (done.find((s) => s.kind === "applied") ?? done[0])?.date ?? null;
}

/** A step's display name: its own title, or its kind. */
export function stepLabel(step: Pick<StepLike, "kind" | "title">): string {
  return step.title || kindLabel(step.kind);
}
