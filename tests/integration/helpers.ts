/** Minimal real file contents: type detection reads the bytes, not the file name. */

export function pdfFile(name = "cv.pdf"): File {
  const body =
    "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n";
  return new File([body], name, { type: "application/pdf" });
}

export function pngFile(name = "screenshot.png"): File {
  // 1x1 transparent PNG.
  const bytes = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    ),
    (c) => c.charCodeAt(0),
  );
  return new File([bytes], name, { type: "image/png" });
}

export function fakePdf(): File {
  return new File(["just text pretending to be a pdf"], "cv.pdf", {
    type: "application/pdf",
  });
}

export async function streamToText(stream: ReadableStream): Promise<string> {
  return new Response(stream).text();
}

export const baseApplication = {
  company: "Example Bank AG",
  role: "Senior Data Engineer",
  location: "Zürich",
  workloadMin: "80",
  workloadMax: "100",
  salaryAsk: "130000",
  language: "de",
  source: "jobs_ch",
  viaAgency: "on",
};

/** The usual first step: applied, done, on a fixed date. */
export const applied = { status: "applied", state: "done", date: "2026-10-10" };

/** Create input with the minimal valid steps. */
export function newApplication(
  application: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) {
  return {
    application: { ...baseApplication, ...application },
    steps: [applied],
    ...extra,
  };
}
