import type { ApplicationSource, PostingLanguage } from "../../lib/enums";

/** Collapse whitespace inside lines and trim blank lines. */
export function cleanText(text: string): string {
  return text
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "BR",
  "LI",
  "UL",
  "OL",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "TR",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "BLOCKQUOTE",
  "PRE",
]);

/** Text content of a node, keeping paragraph and list structure as line breaks. */
export function nodeToText(node: Node): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 3) {
      parts.push(n.textContent ?? "");
      return;
    }
    // Documents and fragments (e.g. <template> content): just walk their children.
    if (n.nodeType === 9 || n.nodeType === 11) {
      n.childNodes.forEach(walk);
      return;
    }
    if (n.nodeType !== 1) return;
    const el = n as Element;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
    const block = BLOCK_TAGS.has(el.tagName);
    if (block) parts.push("\n");
    if (el.tagName === "LI") parts.push("- ");
    el.childNodes.forEach(walk);
    if (block) parts.push("\n");
  };
  walk(node);
  return cleanText(parts.join(""));
}

/** Convert an HTML fragment (e.g. a JSON-LD description) to plain text. */
export function htmlFragmentToText(html: string, document: Document): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  return nodeToText(template.content);
}

/**
 * Parse a workload such as "80-100%", "(80–100 %)", "Pensum 60%" or "100 %".
 * Returns undefined when nothing plausible is found.
 */
export function parseWorkload(
  text: string,
): { min: number; max: number } | undefined {
  const m =
    /(\d{1,3})\s*%?\s*(?:-|–|—|to|bis|à)\s*(\d{1,3})\s*%|(\d{1,3})\s*%/i.exec(
      text,
    );
  if (!m) return undefined;
  const min = Number(m[1] ?? m[3]);
  const max = Number(m[2] ?? m[3]);
  if (min < 10 || max > 100 || min > max) return undefined;
  return { min, max };
}

/** Remove a trailing workload such as " (80–100%)" from a job title. */
export function stripWorkload(title: string): string {
  return title
    .replace(
      /\s*[([]?\s*\d{1,3}\s*%?\s*(?:-|–|—)?\s*\d{0,3}\s*%\s*[)\]]?\s*$/,
      "",
    )
    .trim();
}

// Frequent, short function words: enough to tell DE/FR/EN/IT postings apart.
const STOPWORDS: Record<PostingLanguage, string[]> = {
  de: [
    "und",
    "der",
    "die",
    "das",
    "mit",
    "für",
    "wir",
    "sie",
    "ist",
    "eine",
    "auf",
    "von",
    "zu",
    "ihre",
    "bei",
  ],
  fr: [
    "et",
    "le",
    "la",
    "les",
    "des",
    "pour",
    "avec",
    "vous",
    "nous",
    "une",
    "dans",
    "est",
    "du",
    "sur",
    "votre",
  ],
  en: [
    "and",
    "the",
    "with",
    "for",
    "you",
    "we",
    "our",
    "are",
    "your",
    "is",
    "to",
    "of",
    "in",
    "will",
    "on",
  ],
  it: [
    "e",
    "il",
    "la",
    "per",
    "con",
    "di",
    "che",
    "una",
    "del",
    "della",
    "sono",
    "nel",
    "lavoro",
    "siamo",
    "le",
  ],
};

export function detectLanguage(text: string): PostingLanguage | undefined {
  const words = text.toLowerCase().match(/\p{L}+/gu);
  if (!words || words.length < 20) return undefined;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  let best: PostingLanguage | undefined;
  let bestScore = 0;
  for (const [lang, list] of Object.entries(STOPWORDS) as [
    PostingLanguage,
    string[],
  ][]) {
    const score = list.reduce((sum, w) => sum + (counts.get(w) ?? 0), 0);
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  // Require a meaningful share of stopwords before trusting the guess.
  return bestScore / words.length >= 0.05 ? best : undefined;
}

export function sourceFromUrl(url: URL): ApplicationSource {
  const host = url.hostname.toLowerCase();
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is("jobs.ch")) return "jobs_ch";
  if (is("jobup.ch")) return "jobup_ch";
  if (is("linkedin.com")) return "linkedin";
  return "company_site";
}
