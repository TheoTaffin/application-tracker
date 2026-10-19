import type { StepState } from "./enums";
import { STATUS_LABEL, type ApplicationStatus } from "./status";

/**
 * Rules of the steps timeline, shared by server (summaries, follow-ups) and client
 * (timeline display). Nothing here is stored: everything derives from the steps.
 */

export interface StepLike {
  status: ApplicationStatus;
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

/** The latest step that happened: it defines the application's current status. */
export function currentStep<T extends StepLike>(
  steps: readonly T[],
): T | undefined {
  return sortSteps(steps.filter((s) => s.state === "done")).at(-1);
}

/** The earliest upcoming step: the application's next action. */
export function nextStep<T extends StepLike>(
  steps: readonly T[],
): T | undefined {
  return sortSteps(steps.filter((s) => s.state === "planned"))[0];
}

/** When I applied: the first "applied" step, else the first step that happened. */
export function appliedDate(steps: readonly StepLike[]): string | null {
  const done = sortSteps(steps.filter((s) => s.state === "done"));
  return (done.find((s) => s.status === "applied") ?? done[0])?.date ?? null;
}

/** A step's display name: its own title, or its status. */
export function stepLabel(step: Pick<StepLike, "status" | "title">): string {
  return step.title || STATUS_LABEL[step.status];
}
