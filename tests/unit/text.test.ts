import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  parseWorkload,
  sourceFromUrl,
  stripWorkload,
} from "@/server/extraction/text";

describe("parseWorkload", () => {
  it.each([
    ["Data Engineer (80–100%)", { min: 80, max: 100 }],
    ["Data Engineer 80-100 %", { min: 80, max: 100 }],
    ["Pensum 60 bis 80%", { min: 60, max: 80 }],
    ["Projektleiter 100%", { min: 100, max: 100 }],
    ["Taux d'activité: 50 % - 70 %", { min: 50, max: 70 }],
  ])("parses %s", (text, expected) => {
    expect(parseWorkload(text)).toEqual(expected);
  });

  it.each(["Senior Engineer", "Growth 200%", "Rabatt 5%", "Team 90-60%"])(
    "ignores implausible values in %s",
    (text) => {
      expect(parseWorkload(text)).toBeUndefined();
    },
  );
});

describe("stripWorkload", () => {
  it("removes a trailing workload from a title", () => {
    expect(stripWorkload("Senior Data Engineer (80–100%)")).toBe(
      "Senior Data Engineer",
    );
    expect(stripWorkload("Développeur 60-80%")).toBe("Développeur");
    expect(stripWorkload("Engineer 100 %")).toBe("Engineer");
  });

  it("keeps titles without a workload", () => {
    expect(stripWorkload("Head of Data")).toBe("Head of Data");
  });
});

describe("detectLanguage", () => {
  it("recognises German, French, English and Italian postings", () => {
    expect(
      detectLanguage(
        "Wir suchen für unser Team eine Person, die mit uns die Zukunft gestaltet. Sie arbeiten mit der IT und dem Business zusammen und sind für die Qualität der Daten verantwortlich.",
      ),
    ).toBe("de");
    expect(
      detectLanguage(
        "Nous recherchons une personne pour notre équipe. Vous travaillez avec les équipes produit et vous êtes responsable de la qualité des données pour nos clients.",
      ),
    ).toBe("fr");
    expect(
      detectLanguage(
        "We are looking for an engineer to join our team. You will work with the product team and you are responsible for the quality of the data in our platform.",
      ),
    ).toBe("en");
    expect(
      detectLanguage(
        "Siamo alla ricerca di una persona per il nostro team. Il lavoro si svolge con il team prodotto e con la direzione per la qualità dei dati della azienda.",
      ),
    ).toBe("it");
  });

  it("does not guess on short text", () => {
    expect(detectLanguage("Data Engineer")).toBeUndefined();
  });
});

describe("sourceFromUrl", () => {
  it("recognises Swiss job boards and LinkedIn", () => {
    expect(
      sourceFromUrl(new URL("https://www.jobs.ch/en/vacancies/detail/x/")),
    ).toBe("jobs_ch");
    expect(
      sourceFromUrl(new URL("https://www.jobup.ch/fr/emplois/detail/x/")),
    ).toBe("jobup_ch");
    expect(sourceFromUrl(new URL("https://ch.linkedin.com/jobs/view/1/"))).toBe(
      "linkedin",
    );
    expect(sourceFromUrl(new URL("https://careers.example.com/job/1"))).toBe(
      "company_site",
    );
  });

  it("does not match look-alike domains", () => {
    expect(sourceFromUrl(new URL("https://notjobs.ch/x"))).toBe("company_site");
  });
});
