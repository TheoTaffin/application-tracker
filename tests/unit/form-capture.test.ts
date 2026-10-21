import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  answersToMarkdown,
  captureAnswers,
  parseCapturedAnswers,
  parseSalary,
  salaryAskFrom,
} from "@/lib/form-capture";

/** A made-up application form using the usual ways forms name their fields. */
const FORM = `
  <form>
    <label for="name">Full name</label><input id="name" autocomplete="name">
    <label for="mail">Email</label><input id="mail" type="email">
    <label for="phone">Phone</label><input id="phone" type="tel">
    <input type="hidden" name="token">
    <label for="cv">Resume</label><input id="cv" type="file">

    <label for="why">Why do you want to join?</label><textarea id="why"></textarea>
    <label>What are your salary expectations? <input id="salary"></label>
    <span id="start-q">When can you start?</span><input id="start" aria-labelledby="start-q">
    <input id="city" aria-label="Current city">
    <label for="empty">Anything else?</label><input id="empty">
    <label for="source">How did you hear about us?</label>
    <select id="source"><option value="">Choose</option><option value="li">LinkedIn</option></select>
    <fieldset>
      <legend>Do you need a work permit?</legend>
      <label><input type="radio" name="permit" value="y"> Yes</label>
      <label><input type="radio" name="permit" value="n"> No</label>
    </fieldset>
    <div role="group" aria-label="Preferred teams">
      <label><input type="checkbox" id="team-a"> Platform</label>
      <label><input type="checkbox" id="team-b"> Research</label>
      <label><input type="checkbox" id="team-c"> Sales</label>
    </div>
    <label><input type="checkbox" id="relocate"> Willing to relocate</label>
    <span id="cover-q">Cover letter</span>
    <div id="cover" contenteditable="true" aria-labelledby="cover-q"></div>
  </form>`;

function filledForm() {
  const { document } = new JSDOM(FORM).window;
  const set = (id: string, value: string) =>
    ((document.getElementById(id) as HTMLInputElement).value = value);
  const check = (selector: string) =>
    ((document.querySelector(selector) as HTMLInputElement).checked = true);
  set("name", "Jane Doe");
  set("mail", "jane@example.com");
  set("phone", "+41 00 000 00 00");
  set("why", "  Interesting   problems.  ");
  set("salary", "CHF 120'000");
  set("start", "In 3 months");
  set("city", "Lausanne");
  set("source", "li");
  check('input[name=permit][value="n"]');
  check("#team-a");
  check("#team-b");
  check("#relocate");
  document.getElementById("cover")!.textContent =
    "Dear team, I build data platforms.";
  return document;
}

describe("captureAnswers", () => {
  it("reads each question with its answer, whatever way the field is labelled", () => {
    expect(captureAnswers(filledForm())).toEqual([
      {
        question: "Why do you want to join?",
        answer: "Interesting   problems.",
      },
      { question: "What are your salary expectations?", answer: "CHF 120'000" },
      { question: "When can you start?", answer: "In 3 months" },
      { question: "Current city", answer: "Lausanne" },
      { question: "How did you hear about us?", answer: "LinkedIn" },
      { question: "Do you need a work permit?", answer: "No" },
      { question: "Preferred teams", answer: "Platform, Research" },
      { question: "Willing to relocate", answer: "Yes" },
      {
        question: "Cover letter",
        answer: "Dear team, I build data platforms.",
      },
    ]);
  });

  it("leaves out contact details, files, hidden and empty fields", () => {
    const questions = captureAnswers(filledForm()).map((a) => a.question);
    for (const left of [
      "Full name",
      "Email",
      "Phone",
      "Resume",
      "Anything else?",
    ])
      expect(questions).not.toContain(left);
  });

  it("finds nothing on a page without a filled form", () => {
    expect(captureAnswers(new JSDOM(FORM).window.document)).toEqual([]);
    expect(
      captureAnswers(new JSDOM("<h1>Data Engineer</h1>").window.document),
    ).toEqual([]);
  });
});

describe("parseSalary", () => {
  it.each([
    ["120000", 120_000],
    ["CHF 120'000", 120_000],
    ["120’000 CHF", 120_000],
    ["120 000", 120_000],
    ["120,000 per year", 120_000],
    ["120.000", 120_000],
    ["120k", 120_000],
    ["120-130k CHF", 120_000],
    ["between 120 and 130K", 120_000],
    ["117.5k", 117_500],
  ])("%s -> %i", (text, amount) => {
    expect(parseSalary(text)).toBe(amount);
  });

  it.each(["open to discussion", "", "0"])("%j -> nothing", (text) => {
    expect(parseSalary(text)).toBeUndefined();
  });
});

describe("salaryAskFrom", () => {
  it("takes the first salary question with a number, in English, French or German", () => {
    expect(
      salaryAskFrom([
        { question: "When can you start?", answer: "In 3 months" },
        { question: "Prétentions salariales", answer: "à discuter" },
        { question: "Gehaltsvorstellung", answer: "125'000" },
      ]),
    ).toBe(125_000);
  });

  it("ignores numbers answered to other questions", () => {
    expect(
      salaryAskFrom([{ question: "Years of experience", answer: "8" }]),
    ).toBeUndefined();
  });
});

describe("parseCapturedAnswers", () => {
  const answers = [{ question: "When can you start?", answer: "Now" }];
  const hash = `#answers=${encodeURIComponent(JSON.stringify(answers))}`;

  it("reads the answers the bookmarklet put in the fragment", () => {
    expect(parseCapturedAnswers(hash)).toEqual(answers);
  });

  it.each([
    "",
    "#",
    "#section-2",
    "#answers=not-json",
    `#answers=${encodeURIComponent('{"question":"x"}')}`,
    `#answers=${encodeURIComponent('[{"question":1,"answer":2}]')}`,
    `#answers=${encodeURIComponent("[]")}`,
  ])("ignores %j", (value) => {
    expect(parseCapturedAnswers(value)).toBeNull();
  });
});

describe("answersToMarkdown", () => {
  it("puts each question in bold above its answer", () => {
    expect(
      answersToMarkdown([
        { question: "Why us?", answer: "Interesting problems." },
        { question: "Start date", answer: "June" },
      ]),
    ).toBe("**Why us?**\nInteresting problems.\n\n**Start date**\nJune");
  });
});
