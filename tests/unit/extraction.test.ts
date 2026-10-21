import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { linkedInJobId } from "@/server/extraction/extractors/linkedin";
import {
  extractFromPage,
  normalizeOfferUrl,
  parsePage,
} from "@/server/extraction/registry";

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

const extract = (url: string, file: string) =>
  extractFromPage(parsePage(new URL(url), fixture(file)));

describe("jobs.ch", () => {
  const result = extract(
    "https://www.jobs.ch/en/vacancies/detail/09a14699-65f5-40c6-8757-68a033c267e1/",
    "jobs-ch.html",
  );

  it("extracts the posting from JSON-LD and the workload from the title", () => {
    expect(result.fields).toMatchObject({
      role: "Senior Data Engineer",
      company: "Example Bank AG",
      location: "Zürich",
      workloadMin: 80,
      workloadMax: 100,
      salaryMin: 120000,
      salaryMax: 150000,
      salaryCurrency: "CHF",
      salaryPeriod: "YEAR",
      employmentType: "FULL_TIME",
      source: "jobs_ch",
      language: "de",
    });
    expect(result.extractors).toEqual(["jobs.ch", "json-ld"]);
    expect(result.warnings).toEqual([]);
  });

  it("turns the HTML description into readable text with list items", () => {
    expect(result.fields.description).toContain("Ihre Aufgaben");
    expect(result.fields.description).toContain(
      "- Sie entwickeln und betreiben Datenpipelines",
    );
    expect(result.fields.description).not.toContain("<li>");
  });
});

describe("LinkedIn", () => {
  it("reads the public job page markup", () => {
    const result = extract(
      "https://www.linkedin.com/jobs/view/4479573223/",
      "linkedin.html",
    );
    expect(result.fields).toMatchObject({
      role: "Machine Learning Engineer",
      company: "Example AI",
      location: "Lausanne",
      employmentType: "Full-time",
      source: "linkedin",
      language: "en",
    });
    expect(result.fields.description).toContain(
      "- You will build and ship models",
    );
    expect(result.extractors).toEqual(["linkedin"]);
  });

  it("warns instead of failing when LinkedIn shows a login wall", () => {
    const result = extract(
      "https://www.linkedin.com/jobs/view/1/",
      "plain-page.html",
    );
    expect(result.fields.role).toBeUndefined();
    expect(result.warnings[0]).toMatch(/LinkedIn/);
  });

  it.each([
    ["https://www.linkedin.com/jobs/view/4479573223/", "4479573223"],
    [
      "https://www.linkedin.com/jobs/view/senior-data-engineer-at-visium-4479573223",
      "4479573223",
    ],
    [
      "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4479573223",
      "4479573223",
    ],
  ])("finds the job id in %s", (url, id) => {
    expect(linkedInJobId(new URL(url))).toBe(id);
  });

  it("normalizes search URLs to the job page", () => {
    expect(
      normalizeOfferUrl(
        new URL(
          "https://ch.linkedin.com/jobs/search/?currentJobId=42&keywords=data",
        ),
      ).href,
    ).toBe("https://www.linkedin.com/jobs/view/42/");
  });
});

describe("generic career site", () => {
  const result = extract(
    "https://careers.example.ch/jobs/123",
    "company-site.html",
  );

  it("finds a JobPosting inside @graph and skips malformed JSON-LD", () => {
    expect(result.fields).toMatchObject({
      role: "Développeur·se Full-Stack",
      company: "Exemple SA",
      location: "Genève",
      workloadMin: 60,
      workloadMax: 80,
      salaryMin: 9000,
      salaryMax: 9000,
      salaryPeriod: "MONTH",
      source: "company_site",
      language: "fr",
    });
    expect(result.extractors).toEqual(["json-ld"]);
  });
});

describe("page without structured data", () => {
  const result = extract("https://example.ch/careers", "plain-page.html");

  it("keeps a readable snapshot and uses it as description", () => {
    expect(result.snapshot).toContain("small software company in Bern");
    expect(result.snapshot).not.toContain("Home · About");
    expect(result.fields.description).toBe(result.snapshot);
  });

  it("asks the user to fill in role and company", () => {
    expect(result.fields.role).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
  });
});
