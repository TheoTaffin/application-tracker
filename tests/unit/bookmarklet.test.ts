import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { bookmarkletHref } from "@/components/layout/bookmarklet-link";
import { parseCapturedAnswers } from "@/lib/form-capture";

const posting =
  "https://www.jobs.ch/en/vacancies/detail/123/?source=search&q=données";
const expected = "https://tracker.example/?new=" + encodeURIComponent(posting);
const href = bookmarkletHref("https://tracker.example");

/** Runs the bookmark, decoded the way a browser does, on a fake job posting page. */
function click(
  open: (url: string, target: string) => unknown,
  document: unknown = new JSDOM("<h1>Data Engineer</h1>").window.document,
) {
  const window = { open: vi.fn(open) };
  const location = { href: posting };
  const code = decodeURIComponent(href.slice("javascript:".length));
  const result = new Function(
    "window",
    "location",
    "document",
    `return ${code}`,
  )(window, location, document);
  return { window, location, result };
}

describe("bookmarklet", () => {
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

  it("passes the answers typed in the page's form in the URL fragment", () => {
    const { document } = new JSDOM(
      `<label for="s">Salary expectations</label><input id="s">`,
    ).window;
    (document.getElementById("s") as HTMLInputElement).value = "120k";
    const { window } = click(() => ({}), document);
    const url = window.open.mock.calls[0][0];
    expect(url.startsWith(`${expected}#answers=`)).toBe(true);
    expect(parseCapturedAnswers(url.slice(url.indexOf("#")))).toEqual([
      { question: "Salary expectations", answer: "120k" },
    ]);
  });

  it("still opens the tracker when reading the page fails", () => {
    const broken = {
      querySelectorAll: () => {
        throw new Error("unexpected page");
      },
    };
    const { window } = click(() => ({}), broken);
    expect(window.open).toHaveBeenCalledWith(expected, "_blank");
  });

  it("is a single-line URL, which browsers keep as is", () => {
    expect(href).not.toMatch(/\s/);
  });
});
