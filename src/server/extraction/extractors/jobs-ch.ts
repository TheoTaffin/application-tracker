import { parseWorkload, stripWorkload } from "../text";
import type { FetchedPage, OfferExtractor } from "../types";
import { jsonLdExtractor } from "./json-ld";

/**
 * jobs.ch and jobup.ch (same JobCloud platform). The core fields come from their
 * JSON-LD JobPosting; this adds what is specific to their titles, which carry the
 * workload, e.g. "Data Engineer (80–100%)".
 */
const HOSTS = ["jobs.ch", "jobup.ch"];

export const jobsChExtractor: OfferExtractor = {
  name: "jobs.ch",
  canHandle: (url) =>
    HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`)),
  extract(page: FetchedPage) {
    const { role } = jsonLdExtractor.extract(page);
    if (!role) return {};
    const workload = parseWorkload(role);
    return {
      role: stripWorkload(role),
      workloadMin: workload?.min,
      workloadMax: workload?.max,
    };
  },
};
