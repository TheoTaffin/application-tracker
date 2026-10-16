import "server-only";
import { db, type Executor } from "@/server/db/client";
import type { ApplicationRow } from "@/server/db/schema";
import * as applicationsRepo from "@/server/repositories/applications";
import * as contactsRepo from "@/server/repositories/contacts";
import * as eventsRepo from "@/server/repositories/status-events";
import * as filesRepo from "@/server/repositories/files";
import * as notesRepo from "@/server/repositories/notes";
import * as stagesRepo from "@/server/repositories/stages";
import * as storage from "@/server/storage/s3";
import { APP_TIME_ZONE, FOLLOW_UP_HORIZON_DAYS } from "@/lib/constants";
import {
  APPLICATION_STATUSES,
  STATUS_GROUPS,
  statusGroup,
  type ApplicationStatus,
  type StatusGroup,
} from "@/lib/status";
import {
  applicationInput,
  idInput,
  newApplicationInput,
  statusUpdateInput,
  type ApplicationInput,
} from "@/lib/validation";
import {
  toContactDTO,
  toFileDTO,
  toNoteDTO,
  toStageDTO,
  toStatusEventDTO,
  type ContactDTO,
  type FileDTO,
  type NoteDTO,
  type StageDTO,
  type StatusEventDTO,
} from "./dto";
import { InvalidInputError, NotFoundError, parseInput } from "./errors";
import { deleteFile, uploadFile } from "./file-service";

export { APP_TIME_ZONE, FOLLOW_UP_HORIZON_DAYS };

export function todayInAppTimeZone(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(
    now,
  );
}

/** Add days to a YYYY-MM-DD date (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------- DTOs

export interface ApplicationSummary {
  id: string;
  company: string;
  role: string;
  location: string | null;
  workloadMin: number | null;
  workloadMax: number | null;
  source: ApplicationRow["source"];
  appliedAt: string | null;
  nextActionAt: string | null;
  nextActionNote: string | null;
  status: ApplicationStatus;
  statusGroup: StatusGroup;
  statusAt: Date;
  contactName: string | null;
  updatedAt: Date;
}

export interface ApplicationDetail extends Omit<
  ApplicationRow,
  "resumeId" | "contactId" | "offerExtracted"
> {
  status: ApplicationStatus;
  statusGroup: StatusGroup;
  events: StatusEventDTO[];
  stages: StageDTO[];
  notes: NoteDTO[];
  contact: ContactDTO | null;
  resume: FileDTO | null;
  attachments: FileDTO[];
}

/** Everything the dashboard's side panel shows for one application. */
export interface WorkspaceApplication extends ApplicationSummary {
  offerUrl: string | null;
  salaryAsk: number | null;
  viaAgency: boolean;
  events: StatusEventDTO[];
  stages: StageDTO[];
  notes: NoteDTO[];
  /** The stage marked active, if any: "where I am" in the process. */
  activeStage: StageDTO | null;
  contact: ContactDTO | null;
  resume: FileDTO | null;
  attachments: FileDTO[];
}

export interface Workspace {
  dashboard: Dashboard;
  applications: WorkspaceApplication[];
  options: FormOptions;
}

export interface Dashboard {
  total: number;
  byGroup: Record<StatusGroup, number>;
  byStatus: Record<ApplicationStatus, number>;
  /** Today's date in the app time zone (YYYY-MM-DD), for relative labels. */
  today: string;
  /** Open applications whose next action is overdue or due within the horizon, soonest first. */
  followUps: ApplicationSummary[];
  /** Most recently updated applications. */
  recent: ApplicationSummary[];
}

type ListRow = Awaited<
  ReturnType<typeof applicationsRepo.listApplications>
>[number];

function toSummary({
  application: a,
  status,
  statusAt,
  contactName,
}: ListRow): ApplicationSummary {
  return {
    id: a.id,
    company: a.company,
    role: a.role,
    location: a.location,
    workloadMin: a.workloadMin,
    workloadMax: a.workloadMax,
    source: a.source,
    appliedAt: a.appliedAt,
    nextActionAt: a.nextActionAt,
    nextActionNote: a.nextActionNote,
    status,
    statusGroup: statusGroup(status),
    statusAt,
    contactName,
    updatedAt: a.updatedAt,
  };
}

/** Drop columns that are exposed as resolved objects (resume, contact) or kept internal. */
function withoutInternals(row: ApplicationRow) {
  const fields: Partial<ApplicationRow> = { ...row };
  delete fields.resumeId;
  delete fields.contactId;
  delete fields.offerExtracted;
  return fields as Omit<
    ApplicationRow,
    "resumeId" | "contactId" | "offerExtracted"
  >;
}

// --------------------------------------------------------------------------- reads

export interface ListOptions {
  group?: StatusGroup;
  statuses?: ApplicationStatus[];
  search?: string;
  sort?: applicationsRepo.ListFilters["sort"];
}

export async function listApplications(
  options: ListOptions = {},
): Promise<ApplicationSummary[]> {
  const statuses = options.group
    ? APPLICATION_STATUSES.filter((s) => statusGroup(s) === options.group)
    : options.statuses;
  const rows = await applicationsRepo.listApplications(db(), {
    statuses,
    search: options.search?.trim().slice(0, 100) || undefined,
    sort: options.sort,
  });
  return rows.map(toSummary);
}

export async function getDashboard(now = new Date()): Promise<Dashboard> {
  const all = (
    await applicationsRepo.listApplications(db(), { sort: "updated" })
  ).map(toSummary);
  return summarize(all, now);
}

function summarize(all: ApplicationSummary[], now: Date): Dashboard {
  const byGroup = Object.fromEntries(
    STATUS_GROUPS.map((g) => [g, 0]),
  ) as Record<StatusGroup, number>;
  const byStatus = Object.fromEntries(
    APPLICATION_STATUSES.map((s) => [s, 0]),
  ) as Record<ApplicationStatus, number>;
  for (const a of all) {
    byGroup[a.statusGroup]++;
    byStatus[a.status]++;
  }
  const today = todayInAppTimeZone(now);
  const horizon = addDays(today, FOLLOW_UP_HORIZON_DAYS);
  const followUps = all
    .filter(
      (a) =>
        a.statusGroup !== "closed" &&
        a.nextActionAt &&
        a.nextActionAt <= horizon,
    )
    .sort((a, b) => a.nextActionAt!.localeCompare(b.nextActionAt!));
  return {
    total: all.length,
    byGroup,
    byStatus,
    today,
    followUps,
    recent: all.slice(0, 10),
  };
}

export async function getApplication(
  id: string,
): Promise<ApplicationDetail | null> {
  const parsed = idInput.safeParse(id);
  if (!parsed.success) return null;
  const tx = db();
  const row = await applicationsRepo.findApplication(tx, parsed.data);
  if (!row) return null;
  const [events, attachments, contact, resume, stages, notes] =
    await Promise.all([
      eventsRepo.listStatusEvents(tx, row.id),
      filesRepo.listAttachments(tx, row.id),
      row.contactId ? contactsRepo.findContact(tx, row.contactId) : undefined,
      row.resumeId ? filesRepo.findFile(tx, row.resumeId) : undefined,
      stagesRepo.listStages(tx, [row.id]),
      notesRepo.listNotes(tx, [row.id]),
    ]);
  // Every application is created with an event, so events[0] exists.
  const status = events[0].status;
  return {
    ...withoutInternals(row),
    status,
    statusGroup: statusGroup(status),
    events: events.map(toStatusEventDTO),
    stages: stages.map(toStageDTO),
    notes: notes.map(toNoteDTO),
    contact: contact ? toContactDTO(contact) : null,
    resume: resume ? toFileDTO(resume) : null,
    attachments: attachments.map(toFileDTO),
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string | null) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (k === null) continue;
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Dashboard data in one go: every application with what its side panel shows, plus
 * the counters. A fixed number of queries regardless of how many applications exist,
 * so the dashboard can switch selection and filters in the browser without reloading.
 */
export async function getWorkspace(now = new Date()): Promise<Workspace> {
  const tx = db();
  const rows = await applicationsRepo.listApplications(tx, { sort: "updated" });
  const ids = rows.map((r) => r.application.id);
  const contactIds = [
    ...new Set(rows.flatMap((r) => r.application.contactId ?? [])),
  ];
  const resumeIds = [
    ...new Set(rows.flatMap((r) => r.application.resumeId ?? [])),
  ];
  const [events, stages, notes, attachments, contacts, resumes, options] =
    await Promise.all([
      eventsRepo.listStatusEventsFor(tx, ids),
      stagesRepo.listStages(tx, ids),
      notesRepo.listNotes(tx, ids),
      filesRepo.listAttachmentsFor(tx, ids),
      contactsRepo.findContacts(tx, contactIds),
      filesRepo.findFiles(tx, resumeIds),
      getFormOptions(),
    ]);
  const eventsBy = groupBy(events, (e) => e.applicationId);
  const stagesBy = groupBy(stages, (s) => s.applicationId);
  const notesBy = groupBy(notes, (n) => n.applicationId);
  const attachmentsBy = groupBy(attachments, (f) => f.applicationId);
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const resumeById = new Map(resumes.map((f) => [f.id, f]));

  const applications = rows.map((row): WorkspaceApplication => {
    const a = row.application;
    const appStages = (stagesBy.get(a.id) ?? []).map(toStageDTO);
    const contact = a.contactId ? contactById.get(a.contactId) : undefined;
    const resume = a.resumeId ? resumeById.get(a.resumeId) : undefined;
    return {
      ...toSummary(row),
      offerUrl: a.offerUrl,
      salaryAsk: a.salaryAsk,
      viaAgency: a.viaAgency,
      events: (eventsBy.get(a.id) ?? []).map(toStatusEventDTO),
      stages: appStages,
      notes: (notesBy.get(a.id) ?? []).map(toNoteDTO),
      activeStage: appStages.find((st) => st.state === "active") ?? null,
      contact: contact ? toContactDTO(contact) : null,
      resume: resume ? toFileDTO(resume) : null,
      attachments: (attachmentsBy.get(a.id) ?? []).map(toFileDTO),
    };
  });

  return { dashboard: summarize(applications, now), applications, options };
}

/** Choices for the application form's resume and contact pickers. */
export async function getFormOptions() {
  const tx = db();
  const [resumes, contacts] = await Promise.all([
    filesRepo.listResumes(tx),
    contactsRepo.listContacts(tx),
  ]);
  return {
    resumes: resumes.map(({ file }) => ({ id: file.id, label: file.label })),
    contacts: contacts.map(({ contact }) => ({
      id: contact.id,
      name: contact.name,
      company: contact.company,
    })),
  };
}

export type FormOptions = Awaited<ReturnType<typeof getFormOptions>>;

// ------------------------------------------------------------------------- writes

/** References must point at the right kind of record; FKs alone give poor errors. */
async function checkReferences(
  tx: Executor,
  input: Pick<ApplicationInput, "resumeId" | "contactId">,
) {
  if (input.resumeId) {
    const file = await filesRepo.findFile(tx, input.resumeId);
    if (!file || file.kind !== "resume") {
      throw new InvalidInputError("Unknown resume", {
        resumeId: ["Pick a resume from the library"],
      });
    }
  }
  if (
    input.contactId &&
    !(await contactsRepo.findContact(tx, input.contactId))
  ) {
    throw new InvalidInputError("Unknown contact", {
      contactId: ["Pick an existing contact"],
    });
  }
}

export interface CreateApplicationFiles {
  /** A new resume to add to the library and use for this application. */
  resumeFile?: File | null;
  attachments?: File[];
}

/**
 * Create an application with its first status event, optionally uploading a new
 * resume and attachments. Database writes are transactional; file uploads cannot be,
 * so a failure removes whatever was created before it.
 */
export async function createApplication(
  input: unknown,
  files: CreateApplicationFiles = {},
): Promise<{ id: string }> {
  const { application, initialStatus, newContact, extracted } = parseInput(
    newApplicationInput,
    input,
  );
  const uploadedResume = files.resumeFile
    ? await uploadFile({ file: files.resumeFile, kind: "resume" })
    : null;

  let id: string | undefined;
  try {
    id = await db().transaction(async (tx) => {
      const contactId = newContact
        ? (await contactsRepo.insertContact(tx, newContact)).id
        : application.contactId;
      const values = {
        ...application,
        contactId,
        resumeId: uploadedResume?.id ?? application.resumeId,
        offerExtracted: extracted ?? null,
      };
      await checkReferences(tx, values);
      const row = await applicationsRepo.insertApplication(tx, values);
      // The first event happened when I applied, which may be before today.
      await eventsRepo.insertStatusEvent(tx, {
        applicationId: row.id,
        status: initialStatus,
        occurredAt: application.appliedAt
          ? new Date(application.appliedAt)
          : undefined,
      });
      return row.id;
    });
    for (const file of files.attachments ?? []) {
      await uploadFile({ file, kind: "attachment", applicationId: id });
    }
    return { id };
  } catch (err) {
    if (id) await deleteApplication(id).catch(() => {});
    if (uploadedResume) await deleteFile(uploadedResume.id).catch(() => {});
    throw err;
  }
}

export async function updateApplication(
  id: string,
  input: unknown,
): Promise<void> {
  const applicationId = parseInput(idInput, id);
  const values = parseInput(applicationInput, input);
  await db().transaction(async (tx) => {
    await checkReferences(tx, values);
    const row = await applicationsRepo.updateApplication(
      tx,
      applicationId,
      values,
    );
    if (!row) throw new NotFoundError("Application");
  });
}

export async function deleteApplication(id: string): Promise<void> {
  const applicationId = parseInput(idInput, id);
  const keys = await db().transaction(async (tx) => {
    const attachments = await filesRepo.listAttachments(tx, applicationId);
    // Events and attachment rows are removed by ON DELETE CASCADE.
    const row = await applicationsRepo.deleteApplication(tx, applicationId);
    if (!row) throw new NotFoundError("Application");
    return attachments.map((a) => a.storageKey);
  });
  await storage.deleteObjects(keys).catch(() => {});
}

export async function addStatusUpdate(
  applicationId: string,
  input: unknown,
): Promise<StatusEventDTO> {
  const appId = parseInput(idInput, applicationId);
  const update = parseInput(statusUpdateInput, input);
  return db().transaction(async (tx) => {
    if (!(await applicationsRepo.findApplication(tx, appId)))
      throw new NotFoundError("Application");
    if (update.contactId !== undefined) {
      await checkReferences(tx, {
        resumeId: null,
        contactId: update.contactId,
      });
      await applicationsRepo.updateApplication(tx, appId, {
        contactId: update.contactId,
      });
    }
    const event = await eventsRepo.insertStatusEvent(tx, {
      applicationId: appId,
      status: update.status,
      note: update.note,
      occurredAt: update.occurredAt ? new Date(update.occurredAt) : undefined,
    });
    return toStatusEventDTO(event);
  });
}

export async function addAttachments(
  applicationId: string,
  attachments: File[],
): Promise<FileDTO[]> {
  const appId = parseInput(idInput, applicationId);
  if (!(await applicationsRepo.findApplication(db(), appId)))
    throw new NotFoundError("Application");
  const uploaded: FileDTO[] = [];
  for (const file of attachments) {
    uploaded.push(
      await uploadFile({ file, kind: "attachment", applicationId: appId }),
    );
  }
  return uploaded;
}
