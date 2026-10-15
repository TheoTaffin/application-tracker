import { JSDOM } from "jsdom";
import { jobsChExtractor } from "./extractors/jobs-ch";
import { jsonLdExtractor } from "./extractors/json-ld";
import { linkedInExtractor } from "./extractors/linkedin";
import { readableText } from "./extractors/readability";
import {
  detectLanguage,
  parseWorkload,
  sourceFromUrl,
  stripWorkload,
} from "./text";
import type {
  ExtractedOffer,
  ExtractionResult,
  FetchedPage,
  OfferExtractor,
} from "./types";

/** Most specific first: for each field, the first extractor that finds a value wins. */
export const EXTRACTORS: readonly OfferExtractor[] = [
  jobsChExtractor,
  linkedInExtractor,
  jsonLdExtractor,
];

export function extractorsFor(url: URL): OfferExtractor[] {
  return EXTRACTORS.filter((e) => e.canHandle(url));
}

/** The URL actually worth fetching, e.g. a LinkedIn search URL rewritten to the job page. */
export function normalizeOfferUrl(url: URL): URL {
  const extractor = extractorsFor(url).find((e) => e.normalizeUrl);
  return extractor?.normalizeUrl ? extractor.normalizeUrl(url) : url;
}

export function parsePage(url: URL, html: string): FetchedPage {
  // No `runScripts`: page scripts are never executed.
  const { window } = new JSDOM(html, { url: url.href });
  return { url, html, document: window.document };
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function extractFromPage(page: FetchedPage): ExtractionResult {
  const fields: ExtractedOffer = {};
  const used: string[] = [];
  const warnings: string[] = [];

  for (const extractor of extractorsFor(page.url)) {
    let partial: Partial<ExtractedOffer>;
    try {
      partial = extractor.extract(page);
    } catch (err) {
      warnings.push(`${extractor.name} failed: ${(err as Error).message}`);
      continue;
    }
    let contributed = false;
    for (const [key, value] of Object.entries(partial) as [
      keyof ExtractedOffer,
      unknown,
    ][]) {
      if (!isEmpty(value) && isEmpty(fields[key])) {
        (fields as Record<string, unknown>)[key] = value;
        contributed = true;
      }
    }
    if (contributed) used.push(extractor.name);
  }

  const snapshot = readableText(page.document) ?? null;
  if (!fields.description && snapshot) fields.description = snapshot;

  // Site-independent enrichment.
  if (fields.role && fields.workloadMin === undefined) {
    const workload = parseWorkload(fields.role);
    if (workload) {
      fields.workloadMin = workload.min;
      fields.workloadMax = workload.max;
      fields.role = stripWorkload(fields.role);
    }
  }
  fields.language ??= detectLanguage(fields.description ?? "");
  fields.source ??= sourceFromUrl(page.url);

  if (!fields.role || !fields.company) {
    warnings.push(
      linkedInExtractor.canHandle(page.url)
        ? "LinkedIn did not return the job details (it often requires a login). Paste the offer text instead."
        : "Could not find the role and company on this page. Please fill them in.",
    );
  }

  return { url: page.url.href, fields, snapshot, extractors: used, warnings };
}
