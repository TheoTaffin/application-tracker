import { Readability } from "@mozilla/readability";
import { cleanText } from "../text";

/**
 * Readable main text of any page (Firefox Reader View's algorithm). Used for the
 * offer snapshot and as the description of last resort.
 */
export function readableText(document: Document): string | undefined {
  // Readability mutates the document it is given.
  const article = new Readability(document.cloneNode(true) as Document).parse();
  const text = article?.textContent ? cleanText(article.textContent) : "";
  return text || undefined;
}
