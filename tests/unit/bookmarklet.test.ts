import { describe, expect, it, vi } from "vitest";
import { bookmarkletCode } from "@/components/layout/bookmarklet-link";

const posting =
  "https://www.jobs.ch/en/vacancies/detail/123/?source=search&q=données";
const expected = "https://tracker.example/?new=" + encodeURIComponent(posting);

/** Runs the bookmarklet on a fake job posting page. */
function click(open: (url: string, target: string) => unknown) {
  const window = { open: vi.fn(open) };
  const location = { href: posting };
  const result = new Function(
    "window",
    "location",
    `return ${bookmarkletCode("https://tracker.example")}`,
  )(window, location);
  return { window, location, result };
}

describe("bookmarkletCode", () => {
  it("opens the tracker for the current page in a new tab, leaving the posting open", () => {
    const { window, location, result } = click(() => ({}));
    expect(window.open).toHaveBeenCalledWith(expected, "_blank");
    expect(location.href).toBe(posting);
    // Anything but undefined would replace the posting with the result as a page.
    expect(result).toBeUndefined();
  });

  it("falls back to the same tab when the browser blocks the new one", () => {
    const { location, result } = click(() => null);
    expect(location.href).toBe(expected);
    expect(result).toBeUndefined();
  });
});
