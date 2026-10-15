import "server-only";
import { linkedInExtractor } from "./extractors/linkedin";
import { extractFromPage, normalizeOfferUrl, parsePage } from "./registry";
import { assertSafeUrl, FetchFailedError, safeFetch } from "./safe-fetch";
import type { ExtractionResult } from "./types";

export { UnsafeUrlError, FetchFailedError } from "./safe-fetch";
export type { ExtractedOffer, ExtractionResult } from "./types";

/** HTTP statuses job boards use to turn away automated requests (999 is LinkedIn's). */
const BLOCKED = new Set([401, 403, 429, 999]);

/** Fetch a job posting URL and extract structured fields from it. */
export async function extractOffer(input: string): Promise<ExtractionResult> {
  const url = normalizeOfferUrl(assertSafeUrl(input));
  const res = await safeFetch(url);
  if (BLOCKED.has(res.status)) {
    const site = linkedInExtractor.canHandle(url) ? "LinkedIn" : "The site";
    throw new FetchFailedError(
      `${site} refused the request (it may require a login or limit automated access). Paste the offer text instead.`,
    );
  }
  if (res.status >= 400) {
    throw new FetchFailedError(`The page answered with HTTP ${res.status}`);
  }
  if (!/html/i.test(res.contentType)) {
    throw new FetchFailedError("The link does not point to a web page");
  }
  return extractFromPage(parsePage(res.url, res.body));
}
