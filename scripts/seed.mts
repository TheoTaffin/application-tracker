/**
 * Loads fictional demo data into an EMPTY database (`make seed`), to try the UI.
 * Refuses to run when applications already exist, so it can never mix with real data.
 * Companies and people are made up.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (run `make env`, then `make dev`)");

const client = new pg.Client({ connectionString: url });
await client.connect();

const existing = await client.query("SELECT count(*)::int AS n FROM applications");
if (existing.rows[0].n > 0) {
  console.log(`seed: ${existing.rows[0].n} applications already exist, nothing done.`);
  await client.end();
  process.exit(0);
}

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

/** [status, days from today (negative = past), state, title?, note?] */
type Step = [status: string, inDays: number | null, state: "done" | "planned" | "cancelled", title?: string, note?: string];

interface Demo {
  company: string;
  role: string;
  location: string;
  workload: [number, number];
  salaryAsk?: number;
  language: string;
  source: string;
  viaAgency?: boolean;
  contact?: [name: string, role: string, email: string];
  jobDescription?: string;
  formAnswers?: string;
  steps: Step[];
  notes?: string[];
}

const demos: Demo[] = [
  {
    company: "Alpenbank AG",
    role: "Senior Data Engineer",
    location: "Zürich",
    workload: [80, 100],
    salaryAsk: 135000,
    language: "de",
    source: "jobs_ch",
    contact: ["Lena Brunner", "Talent Acquisition", "lena.brunner@alpenbank.example"],
    jobDescription:
      "Für unser Data-Platform-Team suchen wir eine erfahrene Person.\n\nIhre Aufgaben\n- Datenpipelines mit Databricks und dbt entwickeln\n- Datenqualität sicherstellen\n\nIhr Profil\n- Mehrjährige Erfahrung mit Python und SQL",
    formAnswers:
      "**Why us?** Building trustworthy data products for a regulated domain.\n\n- Notice period: 3 months\n- Permit: C",
    steps: [
      ["applied", -24, "done"],
      ["acknowledged", -22, "done", undefined, "Automatic confirmation"],
      ["screening", -15, "done", "Recruiter screen", "30 min call with Lena, went well"],
      ["interview_1", -2, "done", "Technical round", "Live SQL + pipeline design with the platform lead"],
      ["interview_1", 0, "planned", "Send thank-you note"],
      ["interview_2plus", 6, "planned", "Team fit & leadership"],
    ],
    notes: [
      "They migrate from Hadoop to Databricks this year: mention the Delta Lake project.",
      "Lena said the team is 8 people, reporting to the Head of Data.",
    ],
  },
  {
    company: "Lémanique Assurances SA",
    role: "Analytics Engineer",
    location: "Lausanne",
    workload: [100, 100],
    salaryAsk: 125000,
    language: "fr",
    source: "jobup_ch",
    contact: ["Marc Dufour", "Head of Data", "marc.dufour@lemanique.example"],
    steps: [
      ["applied", -18, "done"],
      ["screening", -11, "done"],
      ["assignment", -4, "done", "Case study received", "Claims dashboard, due in a week"],
      ["assignment", 1, "planned", "Present the case study"],
    ],
  },
  {
    company: "Helvetia Robotics",
    role: "Machine Learning Engineer",
    location: "Basel",
    workload: [80, 100],
    salaryAsk: 140000,
    language: "en",
    source: "linkedin",
    contact: ["Sara Keller", "Engineering Manager", "sara.keller@helvetia-robotics.example"],
    steps: [
      ["applied", -35, "done"],
      ["screening", -28, "done", "Initial recruiter screen"],
      ["interview_1", -20, "done", "Portfolio deep dive", "Walkthrough with the VP Engineering"],
      ["interview_2plus", -12, "done", "Leadership panel", "Panel with the CTO"],
      ["offer", -3, "done", "Written offer received"],
      ["offer", 3, "planned", "Decide on the offer", "Compare remote flexibility with Alpenbank"],
    ],
  },
  {
    company: "Bergbahn Digital",
    role: "Data Platform Lead",
    location: "Chur",
    workload: [90, 100],
    language: "de",
    source: "company_site",
    steps: [
      ["applied", -6, "done"],
      ["applied", -1, "planned", "Follow up: no answer after one week"],
    ],
  },
  {
    company: "Zytglogge Consulting",
    role: "BI Developer (Mandat)",
    location: "Bern",
    workload: [60, 80],
    language: "de",
    source: "recruiter",
    viaAgency: true,
    contact: ["Nico Steiner", "Recruiter", "nico.steiner@zytglogge.example"],
    steps: [
      ["applied", -9, "done"],
      ["acknowledged", -8, "done"],
    ],
  },
  {
    company: "Ticino Pharma SA",
    role: "Data Scientist",
    location: "Lugano",
    workload: [100, 100],
    language: "it",
    source: "jobs_ch",
    steps: [
      ["applied", -40, "done"],
      ["rejected", -30, "done", undefined, "Looking for more pharma experience"],
    ],
  },
  {
    company: "Rheinhafen Logistik",
    role: "Senior Analyst",
    location: "Basel",
    workload: [80, 100],
    language: "de",
    source: "jobup_ch",
    steps: [
      ["applied", -50, "done"],
      ["ghosted", -20, "done", undefined, "No reply after two follow-ups"],
    ],
  },
  {
    company: "Genève Mobilité",
    role: "Data Engineer",
    location: "Genève",
    workload: [80, 80],
    language: "fr",
    source: "company_site",
    steps: [["draft", -2, "done", "Cover letter to finish"]],
  },
];

await client.query("BEGIN");
for (const d of demos) {
  let contactId: string | null = null;
  if (d.contact) {
    const [name, role, email] = d.contact;
    const res = await client.query(
      "INSERT INTO contacts (name, role, email, company) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, role, email, d.company],
    );
    contactId = res.rows[0].id;
  }
  const app = await client.query(
    `INSERT INTO applications (company, role, location, workload_min, workload_max, salary_ask,
       language, source, via_agency, contact_id, job_description, form_answers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      d.company,
      d.role,
      d.location,
      d.workload[0],
      d.workload[1],
      d.salaryAsk ?? null,
      d.language,
      d.source,
      d.viaAgency ?? false,
      contactId,
      d.jobDescription ?? null,
      d.formAnswers ?? null,
    ],
  );
  for (const [status, inDays, state, title, note] of d.steps) {
    await client.query(
      "INSERT INTO application_steps (application_id, status, state, date, title, note) VALUES ($1, $2, $3, $4, $5, $6)",
      [app.rows[0].id, status, state, inDays === null ? null : day(inDays), title ?? null, note ?? null],
    );
  }
  for (const body of d.notes ?? []) {
    await client.query("INSERT INTO application_notes (application_id, body) VALUES ($1, $2)", [
      app.rows[0].id,
      body,
    ]);
  }
}
await client.query("COMMIT");
await client.end();
console.log(`seed: ${demos.length} demo applications created.`);
