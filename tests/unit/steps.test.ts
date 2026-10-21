import { describe, expect, it } from "vitest";
import {
  appliedDate,
  currentStep,
  nextStep,
  sortSteps,
  stepLabel,
  type StepLike,
} from "@/lib/steps";

const step = (s: Partial<StepLike> & Pick<StepLike, "kind">): StepLike => ({
  title: null,
  state: "done",
  date: "2026-10-01",
  createdAt: "2026-10-01T10:00:00Z",
  ...s,
});

describe("steps timeline", () => {
  const steps = [
    step({
      kind: "interview_1",
      date: "2026-10-12",
      title: "Technical round",
    }),
    step({ kind: "applied", date: "2026-10-01" }),
    step({ kind: "interview_2plus", state: "planned", date: "2026-10-20" }),
    step({ kind: "acknowledged", date: "2026-10-03" }),
    step({ kind: "offer", state: "planned", date: null }),
    step({ kind: "screening", state: "cancelled", date: "2026-10-05" }),
  ];

  it("orders steps by date, undated last", () => {
    expect(sortSteps(steps).map((s) => s.kind)).toEqual([
      "applied",
      "acknowledged",
      "screening",
      "interview_1",
      "interview_2plus",
      "offer",
    ]);
  });

  it("derives the current step from the latest done step only", () => {
    expect(currentStep(steps)?.kind).toBe("interview_1");
  });

  it("derives the next action from the earliest planned step", () => {
    expect(nextStep(steps)?.kind).toBe("interview_2plus");
    expect(
      nextStep(steps.filter((s) => s.state !== "planned")),
    ).toBeUndefined();
  });

  it("uses the recording time to order steps on the same day", () => {
    const sameDay = [
      step({ kind: "screening", createdAt: "2026-10-01T12:00:00Z" }),
      step({ kind: "applied", createdAt: "2026-10-01T08:00:00Z" }),
    ];
    expect(currentStep(sameDay)?.kind).toBe("screening");
  });

  it("finds the applied date, falling back to the first step", () => {
    expect(appliedDate(steps)).toBe("2026-10-01");
    expect(appliedDate([step({ kind: "draft", date: "2026-09-28" })])).toBe(
      "2026-09-28",
    );
    expect(appliedDate([])).toBeNull();
  });

  it("lets actions happen without changing the status, but plans them as next steps", () => {
    const withReachOut = [
      ...steps,
      step({ kind: "reach_out", date: "2026-10-15" }),
      step({ kind: "reach_out", state: "planned", date: "2026-10-18" }),
    ];
    expect(currentStep(withReachOut)?.kind).toBe("interview_1");
    expect(nextStep(withReachOut)?.kind).toBe("reach_out");
    expect(stepLabel({ kind: "reach_out", title: null })).toBe("Reach out");
  });

  it("labels a step with its own title or its status", () => {
    expect(stepLabel(steps[0])).toBe("Technical round");
    expect(stepLabel(steps[1])).toBe("Applied");
  });
});
