import type { ApplicationSource, PostingLanguage } from "../../lib/enums";

/** Structured fields pulled from a job posting. Every field is optional. */
export interface ExtractedOffer {
  company?: string;
  role?: string;
  location?: string;
  /** Plain-text description of the posting. */
  description?: string;
  workloadMin?: number;
  workloadMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  /** schema.org unitText, e.g. YEAR, MONTH, HOUR. */
  salaryPeriod?: string;
  employmentType?: string;
  datePosted?: string;
  language?: PostingLanguage;
  source?: ApplicationSource;
}

export interface FetchedPage {
  /** Final URL after redirects. */
  url: URL;
  html: string;
  /** Parsed DOM (scripts never run). Shared by all extractors. */
  document: Document;
}

export interface OfferExtractor {
  name: string;
  canHandle(url: URL): boolean;
  /** Optional canonical URL to fetch instead of the one given (e.g. tracking params removed). */
  normalizeUrl?(url: URL): URL;
  extract(page: FetchedPage): Partial<ExtractedOffer>;
}

export interface ExtractionResult {
  url: string;
  fields: ExtractedOffer;
  /** Readable text of the page, stored as the offer snapshot. */
  snapshot: string | null;
  /** Extractors that contributed at least one field, most specific first. */
  extractors: string[];
  warnings: string[];
}
