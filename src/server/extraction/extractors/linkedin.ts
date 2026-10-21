import { cleanText, nodeToText } from "../text";
import type { ExtractedOffer, FetchedPage, OfferExtractor } from "../types";

/**
 * LinkedIn public ("guest") job pages. They carry no JSON-LD, so fields are read from
 * the top card markup. When LinkedIn answers with a login wall instead, nothing is
 * found and the caller falls back to asking for the pasted offer text.
 */

const isLinkedIn = (url: URL) =>
  url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");

/** /jobs/view/<slug>-<id>, /jobs/view/<id>, or any jobs URL with ?currentJobId=<id>. */
export function linkedInJobId(url: URL): string | undefined {
  const fromQuery = url.searchParams.get("currentJobId");
  if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;
  return /\/jobs\/view\/(?:[^/]*-)?(\d+)\/?$/.exec(url.pathname)?.[1];
}

const text = (document: Document, selector: string) => {
  const el = document.querySelector(selector);
  const value = el ? cleanText(el.textContent ?? "") : "";
  return value || undefined;
};

function criteria(document: Document): Record<string, string> {
  const out: Record<string, string> = {};
  document
    .querySelectorAll(".description__job-criteria-item")
    .forEach((item) => {
      const key = cleanText(
        item.querySelector("h3")?.textContent ?? "",
      ).toLowerCase();
      const value = cleanText(
        item.querySelector(".description__job-criteria-text")?.textContent ??
          "",
      );
      if (key && value) out[key] = value;
    });
  return out;
}

export const linkedInExtractor: OfferExtractor = {
  name: "linkedin",
  canHandle: isLinkedIn,
  normalizeUrl(url) {
    const id = linkedInJobId(url);
    return id ? new URL(`https://www.linkedin.com/jobs/view/${id}/`) : url;
  },
  extract({ document }: FetchedPage) {
    const descriptionNode = document.querySelector(
      ".show-more-less-html__markup",
    );
    const result: Partial<ExtractedOffer> = {
      role: text(document, ".top-card-layout__title"),
      company:
        text(document, ".topcard__org-name-link") ??
        text(document, ".topcard__flavor"),
      location: text(document, ".topcard__flavor--bullet"),
      description: descriptionNode ? nodeToText(descriptionNode) : undefined,
      employmentType: criteria(document)["employment type"],
    };
    if (result.location) {
      // "Zurich, Zurich, Switzerland" -> "Zurich"
      result.location = result.location.split(",")[0].trim();
    }
    return result;
  },
};
