import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUSES,
  STATUS_GROUP,
  STATUS_LABEL,
  statusGroup,
  statusTone,
} from "@/lib/status";

describe("status model", () => {
  it("maps every status to a group and a label", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(STATUS_GROUP[status]).toBeDefined();
      expect(STATUS_LABEL[status]).toBeTruthy();
    }
  });

  it("groups statuses into pending, on-going and closed", () => {
    expect(statusGroup("applied")).toBe("pending");
    expect(statusGroup("interview_1")).toBe("ongoing");
    expect(statusGroup("offer")).toBe("ongoing");
    expect(statusGroup("ghosted")).toBe("closed");
  });

  it("colors accepted and rejected distinctly within the closed group", () => {
    expect(statusTone("accepted")).toBe("green");
    expect(statusTone("rejected")).toBe("red");
    expect(statusTone("withdrawn")).toBe("grey");
    expect(statusTone("draft")).toBe("amber");
    expect(statusTone("screening")).toBe("green");
  });
});
