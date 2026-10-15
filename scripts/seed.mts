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

type Event = [status: string, daysAgo: number, note?: string];
interface Demo {
  company: string;
  role: string;
  location: string;
  workload: [number, number];
  salaryAsk?: number;
  language: string;
  source: string;
  viaAgency?: boolean;
  appliedDaysAgo: number;
  next?: [inDays: number, note: string];
  contact?: [name: string, role: string, email: string];
  description?: string;
  formAnswers?: string;
  events: Event[];
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
    appliedDaysAgo: 24,
    next: [0, "Send thank-you note after the technical round"],
    contact: ["Lena Brunner", "Talent Acquisition", "lena.brunner@alpenbank.example"],
    description: "Data platform team, Databricks + dbt. Hybrid, 2 days on site.",
    formAnswers:
      "**Why us?** Building trustworthy data products for a regulated domain.\n\n- Notice period: 3 months\n- Permit: C",
    events: [
      ["applied", 24],
      ["acknowledged", 22, "Automatic confirmation"],
      ["screening", 15, "30 min call with Lena, went well"],
      ["interview_1", 2, "Technical round with the platform lead"],
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
    appliedDaysAgo: 18,
    next: [1, "Prepare the take-home case presentation"],
    contact: ["Marc Dufour", "Head of Data", "marc.dufour@lemanique.example"],
    events: [
      ["applied", 18],
      ["screening", 11],
      ["assignment", 4, "Case study: claims dashboard, due in a week"],
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
    appliedDaysAgo: 35,
    next: [3, "Decide on the offer"],
    contact: ["Sara Keller", "Engineering Manager", "sara.keller@helvetia-robotics.example"],
    events: [
      ["applied", 35],
      ["screening", 28],
      ["interview_1", 20],
      ["interview_2plus", 12, "Panel with the CTO"],
      ["offer", 3, "Written offer received"],
    ],
  },
  {
    company: "Bergbahn Digital",
    role: "Data Platform Lead",
    location: "Chur",
    workload: [90, 100],
    language: "de",
    source: "company_site",
    appliedDaysAgo: 6,
    next: [-1, "Follow up: no answer after one week"],
    events: [["applied", 6]],
  },
  {
    company: "Zytglogge Consulting",
    role: "BI Developer (Mandat)",
    location: "Bern",
    workload: [60, 80],
    language: "de",
    source: "recruiter",
    viaAgency: true,
    appliedDaysAgo: 9,
    contact: ["Nico Steiner", "Recruiter", "nico.steiner@zytglogge.example"],
    events: [
      ["applied", 9],
      ["acknowledged", 8],
    ],
  },
  {
    company: "Ticino Pharma SA",
    role: "Data Scientist",
    location: "Lugano",
    workload: [100, 100],
    language: "it",
    source: "jobs_ch",
    appliedDaysAgo: 40,
    events: [
      ["applied", 40],
      ["rejected", 30, "Looking for more pharma experience"],
    ],
  },
  {
    company: "Rheinhafen Logistik",
    role: "Senior Analyst",
    location: "Basel",
    workload: [80, 100],
    language: "de",
    source: "jobup_ch",
    appliedDaysAgo: 50,
    events: [
      ["applied", 50],
      ["ghosted", 20, "No reply after two follow-ups"],
    ],
  },
  {
    company: "Genève Mobilité",
    role: "Data Engineer",
    location: "Genève",
    workload: [80, 80],
    language: "fr",
    source: "company_site",
    appliedDaysAgo: 2,
    events: [["draft", 2, "Cover letter to finish"]],
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
       language, source, via_agency, applied_at, next_action_at, next_action_note, contact_id,
       description, form_answers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
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
      day(-d.appliedDaysAgo),
      d.next ? day(d.next[0]) : null,
      d.next?.[1] ?? null,
      contactId,
      d.description ?? null,
      d.formAnswers ?? null,
    ],
  );
  for (const [status, daysAgo, note] of d.events) {
    await client.query(
      "INSERT INTO status_events (application_id, status, occurred_at, note) VALUES ($1, $2, $3, $4)",
      [app.rows[0].id, status, `${day(-daysAgo)}T09:00:00Z`, note ?? null],
    );
  }
}
await client.query("COMMIT");
await client.end();
console.log(`seed: ${demos.length} demo applications created.`);
