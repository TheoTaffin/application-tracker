import { describe, expect, it } from "vitest";
import {
  appliedDate,
  currentStep,
  nextStep,
  sortSteps,
  stepLabel,
  type StepLike,
} from "@/lib/steps";

const step = (s: Partial<StepLike> & Pick<StepLike, "status">): StepLike => ({
  title: null,
  state: "done",
  date: "2026-10-01",
  createdAt: "2026-10-01T10:00:00Z",
  ...s,
});

describe("steps timeline", () => {
  const steps = [
    step({
      status: "interview_1",
      date: "2026-10-12",
      title: "Technical round",
    }),
    step({ status: "applied", date: "2026-10-01" }),
    step({ status: "interview_2plus", state: "planned", date: "2026-10-20" }),
    step({ status: "acknowledged", date: "2026-10-03" }),
    step({ status: "offer", state: "planned", date: null }),
    step({ status: "screening", state: "cancelled", date: "2026-10-05" }),
  ];

  it("orders steps by date, undated last", () => {
    expect(sortSteps(steps).map((s) => s.status)).toEqual([
      "applied",
      "acknowledged",
      "screening",
      "interview_1",
      "interview_2plus",
      "offer",
    ]);
  });

  it("derives the current step from the latest done step only", () => {
    expect(currentStep(steps)?.status).toBe("interview_1");
  });

  it("derives the next action from the earliest planned step", () => {
    expect(nextStep(steps)?.status).toBe("interview_2plus");
    expect(
      nextStep(steps.filter((s) => s.state !== "planned")),
    ).toBeUndefined();
  });

  it("uses the recording time to order steps on the same day", () => {
    const sameDay = [
      step({ status: "screening", createdAt: "2026-10-01T12:00:00Z" }),
      step({ status: "applied", createdAt: "2026-10-01T08:00:00Z" }),
    ];
    expect(currentStep(sameDay)?.status).toBe("screening");
  });

  it("finds the applied date, falling back to the first step", () => {
    expect(appliedDate(steps)).toBe("2026-10-01");
    expect(appliedDate([step({ status: "draft", date: "2026-09-28" })])).toBe(
      "2026-09-28",
    );
    expect(appliedDate([])).toBeNull();
  });

  it("labels a step with its own title or its status", () => {
    expect(stepLabel(steps[0])).toBe("Technical round");
    expect(stepLabel(steps[1])).toBe("Applied");
  });
});
