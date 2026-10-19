import { describe, expect, it } from "vitest";
import * as applications from "@/server/services/application-service";
import * as contacts from "@/server/services/contact-service";
import * as files from "@/server/services/file-service";
import { ConflictError, InvalidInputError } from "@/server/services/errors";
import * as progress from "@/server/services/progress-service";
import {
  applied,
  fakePdf,
  newApplication,
  pdfFile,
  pngFile,
  streamToText,
} from "./helpers";

describe("creating an application", () => {
  it("stores the application with its steps, first note, new contact, resume and attachments", async () => {
    const { id } = await applications.createApplication(
      newApplication(
        { jobDescription: "We build data platforms." },
        {
          steps: [
            applied,
            { status: "acknowledged", state: "done", date: "2026-10-12" },
            {
              status: "screening",
              title: "Call with HR",
              state: "planned",
              date: "2026-10-20",
            },
          ],
          note: "Referred by a former colleague",
          newContact: {
            name: "Anna Muster",
            email: "anna@example.ch",
            role: "Recruiter",
          },
          extracted: { role: "Senior Data Engineer", source: "jobs_ch" },
        },
      ),
      {
        resumeFile: pdfFile("CV_EN_v3.pdf"),
        attachments: [pngFile(), pdfFile("letter.pdf")],
      },
    );

    const detail = await applications.getApplication(id);
    expect(detail).toMatchObject({
      company: "Example Bank AG",
      jobDescription: "We build data platforms.",
      workloadMin: 80,
      workloadMax: 100,
      salaryAsk: 130000,
      viaAgency: true,
      appliedAt: "2026-10-10",
      status: "acknowledged",
      statusGroup: "pending",
      currentStep: { status: "acknowledged", date: "2026-10-12" },
      nextStep: {
        status: "screening",
        title: "Call with HR",
        state: "planned",
      },
      notes: [{ body: "Referred by a former colleague" }],
      contact: { name: "Anna Muster", email: "anna@example.ch" },
      resume: { label: "CV_EN_v3", kind: "resume", mime: "application/pdf" },
    });
    expect(detail!.steps.map((s) => s.status)).toEqual([
      "applied",
      "acknowledged",
      "screening",
    ]);
    expect(detail!.attachments.map((a) => a.mime).sort()).toEqual([
      "application/pdf",
      "image/png",
    ]);
  });

  it("never exposes storage keys in DTOs", async () => {
    const { id } = await applications.createApplication(newApplication(), {
      resumeFile: pdfFile(),
    });
    const json = JSON.stringify(await applications.getApplication(id));
    expect(json).not.toMatch(/storageKey|resumes\//);
  });

  it("reports field errors by path, including steps", async () => {
    const error = await applications
      .createApplication(
        newApplication(
          { company: " ", workloadMin: "90", workloadMax: "60" },
          { steps: [{ status: "applied", state: "done", date: "" }] },
        ),
      )
      .catch((e) => e);
    expect(error).toBeInstanceOf(InvalidInputError);
    expect(Object.keys(error.fieldErrors)).toEqual(
      expect.arrayContaining([
        "application.company",
        "application.workloadMax",
        "steps.0.date",
      ]),
    );
  });

  it("requires at least one step that happened", async () => {
    const error = await applications
      .createApplication(
        newApplication(
          {},
          {
            steps: [
              { status: "interview_1", state: "planned", date: "2026-11-01" },
            ],
          },
        ),
      )
      .catch((e) => e);
    expect(error).toBeInstanceOf(InvalidInputError);
    expect(error.fieldErrors.steps).toBeDefined();
  });

  it("rejects a resume id that points at an attachment", async () => {
    const { id } = await applications.createApplication(newApplication(), {
      attachments: [pdfFile()],
    });
    const [attachment] = (await applications.getApplication(id))!.attachments;
    await expect(
      applications.createApplication(
        newApplication({ resumeId: attachment.id }),
      ),
    ).rejects.toThrow("Unknown resume");
  });

  it("rolls back uploads when a later step fails", async () => {
    await expect(
      applications.createApplication(newApplication(), {
        resumeFile: pdfFile(),
        attachments: [fakePdf()],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(await applications.listApplications()).toHaveLength(0);
    expect(await files.listResumes()).toHaveLength(0);
  });
});

describe("listing and dashboard", () => {
  it("counts by group and lists follow-ups from planned steps, excluding closed ones", async () => {
    const plan = (date: string) => ({
      status: "applied",
      title: "Follow up",
      state: "planned",
      date,
    });
    const due = await applications.createApplication(
      newApplication(
        { company: "Due AG" },
        { steps: [applied, plan("2026-10-14")] },
      ),
    );
    const soon = await applications.createApplication(
      newApplication(
        { company: "Soon AG" },
        { steps: [applied, plan("2026-10-17")] },
      ),
    );
    await applications.createApplication(
      newApplication(
        { company: "Later AG" },
        { steps: [applied, plan("2026-12-01")] },
      ),
    );
    await applications.createApplication(
      newApplication(
        { company: "Closed AG" },
        {
          steps: [
            applied,
            { status: "rejected", state: "done", date: "2026-10-12" },
            plan("2026-10-01"),
          ],
        },
      ),
    );

    const dashboard = await applications.getDashboard(
      new Date("2026-10-15T10:00:00+02:00"),
    );
    expect(dashboard.total).toBe(4);
    expect(dashboard.today).toBe("2026-10-15");
    expect(dashboard.byGroup).toEqual({ pending: 3, ongoing: 0, closed: 1 });
    expect(dashboard.byStatus.rejected).toBe(1);
    expect(dashboard.followUps.map((a) => a.id)).toEqual([due.id, soon.id]);
  });

  it("filters by group and searches literally", async () => {
    await applications.createApplication(
      newApplication({ company: "100% Remote GmbH" }),
    );
    await applications.createApplication(
      newApplication({ company: "Other AG" }),
    );

    expect(
      (await applications.listApplications({ search: "100%" })).map(
        (a) => a.company,
      ),
    ).toEqual(["100% Remote GmbH"]);
    expect(await applications.listApplications({ search: "%" })).toHaveLength(
      1,
    );
    expect(
      await applications.listApplications({ group: "closed" }),
    ).toHaveLength(0);
  });
});

describe("files", () => {
  it("serves stored bytes back unchanged", async () => {
    const resume = await files.uploadFile({ file: pdfFile(), kind: "resume" });
    const opened = await files.openFile(resume.id);
    expect(await streamToText(opened!.stream)).toMatch(/^%PDF-1\.4/);
    expect(opened!.file.url).toBe(`/api/files/${resume.id}`);
  });

  it("detects the real type instead of trusting the name", async () => {
    await expect(
      files.uploadFile({ file: fakePdf(), kind: "resume" }),
    ).rejects.toThrow(/Unsupported file type/);
    await expect(
      files.uploadFile({ file: pngFile(), kind: "resume" }),
    ).rejects.toThrow(/Unsupported file type/);
  });

  it("refuses to delete a resume that is in use", async () => {
    const resume = await files.uploadFile({ file: pdfFile(), kind: "resume" });
    await applications.createApplication(
      newApplication({ resumeId: resume.id }),
    );
    await expect(files.deleteFile(resume.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect((await files.listResumes())[0].uses).toBe(1);
  });

  it("deletes attachments, steps and notes with their application", async () => {
    const { id } = await applications.createApplication(
      newApplication({}, { note: "x" }),
      {
        attachments: [pngFile()],
      },
    );
    const detail = (await applications.getApplication(id))!;
    await applications.deleteApplication(id);
    expect(await files.openFile(detail.attachments[0].id)).toBeNull();
    await expect(progress.deleteStep(detail.steps[0].id)).rejects.toThrow(
      /not found/,
    );
    await expect(progress.deleteNote(detail.notes[0].id)).rejects.toThrow(
      /not found/,
    );
  });
});

describe("contacts", () => {
  it("keeps applications when their contact is deleted", async () => {
    const contact = await contacts.createContact({
      name: "Recruiter",
      email: "r@agency.ch",
    });
    const { id } = await applications.createApplication(
      newApplication({ contactId: contact.id }),
    );
    expect((await contacts.listContacts())[0].applicationCount).toBe(1);
    await contacts.deleteContact(contact.id);
    expect((await applications.getApplication(id))!.contact).toBeNull();
  });

  it("validates emails", async () => {
    await expect(
      contacts.createContact({ name: "X", email: "not-an-email" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
