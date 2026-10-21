import { cleanText, htmlFragmentToText } from "../text";
import type { ExtractedOffer, FetchedPage, OfferExtractor } from "../types";

/**
 * Generic schema.org JobPosting parser (JSON-LD). Most ATSs and many career sites
 * embed one, including jobs.ch and jobup.ch.
 */

type Json = Record<string, unknown>;

const asRecord = (v: unknown): Json | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : undefined;
const asString = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;
const asNumber = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};
const first = <T>(v: T | T[] | undefined): T | undefined =>
  Array.isArray(v) ? v[0] : v;

function isJobPosting(node: Json): boolean {
  const type = node["@type"];
  return (
    type === "JobPosting" ||
    (Array.isArray(type) && type.includes("JobPosting"))
  );
}

/** Every JSON-LD node on the page, flattening arrays and @graph containers. */
export function jsonLdNodes(document: Document): Json[] {
  const nodes: Json[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    const node = asRecord(value);
    if (!node) return;
    nodes.push(node);
    if (node["@graph"]) visit(node["@graph"]);
  };
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((script) => {
      try {
        visit(JSON.parse(script.textContent ?? ""));
      } catch {
        // Malformed JSON-LD is common; ignore the block.
      }
    });
  return nodes;
}

function location(posting: Json): string | undefined {
  const place = asRecord(
    first(posting.jobLocation as unknown[] | Json | undefined),
  );
  const address = asRecord(place?.address);
  if (!address) return asString(place?.name);
  const city =
    asString(address.addressLocality) ?? asString(address.addressRegion);
  const country =
    asString(address.addressCountry) ??
    asString(asRecord(address.addressCountry)?.name);
  if (city && country && country !== "CH" && country !== "Switzerland")
    return `${city}, ${country}`;
  return city ?? country;
}

function salary(posting: Json): Partial<ExtractedOffer> {
  const base = asRecord(posting.baseSalary);
  if (!base) return {};
  const value = asRecord(base.value);
  const single = asNumber(base.value) ?? asNumber(value?.value);
  return {
    salaryMin: asNumber(value?.minValue) ?? single,
    salaryMax: asNumber(value?.maxValue) ?? single,
    salaryCurrency: asString(base.currency),
    salaryPeriod: asString(value?.unitText) ?? asString(base.unitText),
  };
}

export function parseJobPosting(
  posting: Json,
  document: Document,
): Partial<ExtractedOffer> {
  const description = asString(posting.description);
  const employmentType = first(
    posting.employmentType as string | string[] | undefined,
  );
  return {
    role: asString(posting.title) && cleanText(asString(posting.title)!),
    company:
      asString(asRecord(posting.hiringOrganization)?.name) ??
      asString(posting.hiringOrganization),
    location: location(posting),
    description: description && htmlFragmentToText(description, document),
    employmentType: asString(employmentType),
    datePosted: asString(posting.datePosted),
    ...salary(posting),
  };
}

export const jsonLdExtractor: OfferExtractor = {
  name: "json-ld",
  canHandle: () => true,
  extract({ document }: FetchedPage) {
    const posting = jsonLdNodes(document).find(isJobPosting);
    return posting ? parseJobPosting(posting, document) : {};
  },
};
