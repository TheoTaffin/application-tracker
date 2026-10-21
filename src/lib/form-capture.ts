/** A question of a job application form and what the user answered. */
export interface CapturedAnswer {
  question: string;
  answer: string;
}

/**
 * Runs inside the job posting's page, from the save-to-tracker bookmarklet: reads the
 * application form's questions and what has been typed in them so far. Empty fields,
 * files and contact details (name, email, phone, address) are left out.
 *
 * The bookmarklet embeds it with `toString()`, so it must stay self-contained: no
 * imports, no variables from outside the function.
 */
export function captureAnswers(doc: Document): CapturedAnswer[] {
  const SKIPPED_TYPES = [
    "hidden",
    "password",
    "submit",
    "button",
    "reset",
    "image",
    "file",
    "email",
    "tel",
  ];
  const CONTACT_AUTOCOMPLETE =
    /\b(name|given-name|family-name|email|tel|street-address|address-line\d|postal-code|address-level\d|country|country-name|bday)\b/;
  const text = (el: Element | null | undefined) =>
    ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim();
  const byIds = (ids: string | null) =>
    (ids ?? "")
      .split(/\s+/)
      .map((id) => text(doc.getElementById(id)))
      .join(" ")
      .trim();
  // The field's own label: <label for>, a wrapping <label>, aria attributes, placeholder.
  const ownLabel = (f: HTMLElement) =>
    ("labels" in f ? [...((f as HTMLInputElement).labels ?? [])] : [])
      .map(text)
      .find(Boolean) ||
    byIds(f.getAttribute("aria-labelledby")) ||
    f.getAttribute("aria-label") ||
    f.getAttribute("placeholder") ||
    "";
  // The question of a group of checkboxes or radio buttons.
  const groupLabel = (f: HTMLElement) => {
    const group = f.closest("fieldset, [role=radiogroup], [role=group]");
    return group
      ? text(group.querySelector("legend")) ||
          byIds(group.getAttribute("aria-labelledby")) ||
          group.getAttribute("aria-label") ||
          ""
      : "";
  };

  const answers = new Map<string, string[]>();
  const fields = doc.querySelectorAll<HTMLElement>(
    "input, textarea, select, [contenteditable=true]",
  );
  for (const f of fields) {
    const type = (f.getAttribute("type") ?? "").toLowerCase();
    if (SKIPPED_TYPES.includes(type)) continue;
    if (CONTACT_AUTOCOMPLETE.test(f.getAttribute("autocomplete") ?? ""))
      continue;

    let question: string;
    let answer: string;
    if (type === "checkbox" || type === "radio") {
      if (!(f as HTMLInputElement).checked) continue;
      const group = groupLabel(f);
      question = group || ownLabel(f);
      answer = group ? ownLabel(f) || (f as HTMLInputElement).value : "Yes";
    } else if (f.tagName === "SELECT") {
      const select = f as HTMLSelectElement;
      if (!select.value) continue;
      question = ownLabel(f);
      answer = text(select.selectedOptions[0]) || select.value;
    } else if (
      f.isContentEditable ||
      f.getAttribute("contenteditable") === "true"
    ) {
      question = ownLabel(f);
      answer = text(f);
    } else {
      question = ownLabel(f);
      answer = ((f as HTMLInputElement).value ?? "").trim();
    }
    if (!question || !answer) continue;
    answers.set(question, [...(answers.get(question) ?? []), answer]);
  }
  return [...answers].map(([question, values]) => ({
    question: question.slice(0, 500),
    answer: values.join(", ").slice(0, 5000),
  }));
}

/** The answers the bookmarklet put in the URL fragment (`#answers=<json>`), if any. */
export function parseCapturedAnswers(hash: string): CapturedAnswer[] | null {
  const match = /^#?answers=(.*)$/.exec(hash);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(match[1]));
    if (!Array.isArray(parsed)) return null;
    const answers = parsed.filter(
      (a): a is CapturedAnswer =>
        typeof a?.question === "string" && typeof a?.answer === "string",
    );
    return answers.length ? answers : null;
  } catch {
    return null;
  }
}

/** The form's questions and answers, as Markdown for the "what I answered" field. */
export function answersToMarkdown(answers: CapturedAnswer[]): string {
  return answers
    .map(({ question, answer }) => `**${question}**\n${answer}`)
    .join("\n\n")
    .slice(0, 50_000);
}

const SALARY_QUESTION =
  /salar|compensation|remuneration|rémunération|salaire|gehalt|lohn|stipendio|retribuzione/i;

/** A yearly amount written the usual ways: 120000, 120'000, 120 000, 120,000, 120k, 120-130k. */
export function parseSalary(text: string): number | undefined {
  // Thousands separators: a separator followed by exactly three digits.
  const plain = text.replace(/(\d)['’\s ,.](?=\d{3}(?!\d))/g, "$1");
  const match = /\d+(?:\.\d+)?/.exec(plain);
  if (!match) return undefined;
  let amount = Number(match[0]);
  if (amount < 1000 && /\d\s*k\b/i.test(plain)) amount *= 1000;
  amount = Math.round(amount);
  return amount > 0 && amount <= 10_000_000 ? amount : undefined;
}

/** The salary asked for, from the first salary question that has a number. */
export function salaryAskFrom(answers: CapturedAnswer[]): number | undefined {
  for (const { question, answer } of answers) {
    if (!SALARY_QUESTION.test(question)) continue;
    const amount = parseSalary(answer);
    if (amount) return amount;
  }
  return undefined;
}
