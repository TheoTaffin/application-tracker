import { describe, expect, it } from "vitest";
import * as applications from "@/server/services/application-service";
import * as contacts from "@/server/services/contact-service";
import * as files from "@/server/services/file-service";
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
} from "@/server/services/errors";
import {
  baseApplication,
  fakePdf,
  pdfFile,
  pngFile,
  streamToText,
} from "./helpers";

describe("creating an application", () => {
  it("stores the application with its first status, a new contact, resume and attachments", async () => {
    const { id } = await applications.createApplication(
      {
        application: baseApplication,
        initialStatus: "applied",
        newContact: {
          name: "Anna Muster",
          email: "anna@example.ch",
          role: "Recruiter",
        },
        extracted: { role: "Senior Data Engineer", source: "jobs_ch" },
      },
      {
        resumeFile: pdfFile("CV_EN_v3.pdf"),
        attachments: [pngFile(), pdfFile("letter.pdf")],
      },
    );

    const detail = await applications.getApplication(id);
    expect(detail).toMatchObject({
      company: "Example Bank AG",
      workloadMin: 80,
      workloadMax: 100,
      salaryAsk: 130000,
      viaAgency: true,
      appliedAt: "2026-10-10",
      status: "applied",
      statusGroup: "pending",
      contact: { name: "Anna Muster", email: "anna@example.ch" },
      resume: { label: "CV_EN_v3", kind: "resume", mime: "application/pdf" },
    });
    expect(detail!.events).toHaveLength(1);
    expect(detail!.attachments.map((a) => a.mime).sort()).toEqual([
      "application/pdf",
      "image/png",
    ]);
  });

  it("never exposes storage keys in DTOs", async () => {
    const { id } = await applications.createApplication(
      { application: baseApplication },
      { resumeFile: pdfFile() },
    );
    const json = JSON.stringify(await applications.getApplication(id));
    expect(json).not.toMatch(/storageKey|resumes\//);
  });

  it("reports field errors for invalid input", async () => {
    const error = await applications
      .createApplication({
        application: {
          ...baseApplication,
          company: " ",
          workloadMin: "90",
          workloadMax: "60",
        },
      })
      .catch((e) => e);
    expect(error).toBeInstanceOf(InvalidInputError);
    expect(Object.keys(error.fieldErrors)).toEqual(
      expect.arrayContaining([
        "application.company",
        "application.workloadMax",
      ]),
    );
  });

  it("rejects a resume id that points at an attachment", async () => {
    const { id } = await applications.createApplication(
      { application: baseApplication },
      { attachments: [pdfFile()] },
    );
    const [attachment] = (await applications.getApplication(id))!.attachments;
    await expect(
      applications.createApplication({
        application: { ...baseApplication, resumeId: attachment.id },
      }),
    ).rejects.toThrow("Unknown resume");
  });

  it("rolls back uploads when a later step fails", async () => {
    await expect(
      applications.createApplication(
        { application: baseApplication },
        { resumeFile: pdfFile(), attachments: [fakePdf()] },
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(await applications.listApplications()).toHaveLength(0);
    expect(await files.listResumes()).toHaveLength(0);
  });
});

describe("status updates", () => {
  it("uses the most recent event as the current status", async () => {
    const { id } = await applications.createApplication({
      application: baseApplication,
    });
    await applications.addStatusUpdate(id, {
      status: "interview_1",
      occurredAt: "2026-10-20",
    });
    // Recorded later but happened earlier: must not become the current status.
    await applications.addStatusUpdate(id, {
      status: "acknowledged",
      occurredAt: "2026-10-12",
    });

    const detail = await applications.getApplication(id);
    expect(detail!.status).toBe("interview_1");
    expect(detail!.statusGroup).toBe("ongoing");
    expect(detail!.events.map((e) => e.status)).toEqual([
      "interview_1",
      "acknowledged",
      "applied",
    ]);
  });

  it("can switch the contact with an update", async () => {
    const { id } = await applications.createApplication({
      application: baseApplication,
    });
    const contact = await contacts.createContact({ name: "Hiring Manager" });
    await applications.addStatusUpdate(id, {
      status: "screening",
      contactId: contact.id,
    });
    expect((await applications.getApplication(id))!.contact?.name).toBe(
      "Hiring Manager",
    );
  });

  it("fails for an unknown application", async () => {
    await expect(
      applications.addStatusUpdate("00000000-0000-4000-8000-000000000000", {
        status: "offer",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("listing and dashboard", () => {
  it("counts by group and lists due follow-ups, excluding closed ones", async () => {
    const due = await applications.createApplication({
      application: {
        ...baseApplication,
        company: "Due AG",
        nextActionAt: "2026-10-14",
      },
    });
    await applications.createApplication({
      application: {
        ...baseApplication,
        company: "Later AG",
        nextActionAt: "2026-12-01",
      },
    });
    const closed = await applications.createApplication({
      application: {
        ...baseApplication,
        company: "Closed AG",
        nextActionAt: "2026-10-01",
      },
    });
    await applications.addStatusUpdate(closed.id, { status: "rejected" });

    const dashboard = await applications.getDashboard(
      new Date("2026-10-15T10:00:00+02:00"),
    );
    // Due within the two-day horizon also counts; three days out does not.
    const soon = await applications.createApplication({
      application: {
        ...baseApplication,
        company: "Soon AG",
        nextActionAt: "2026-10-17",
      },
    });
    await applications.createApplication({
      application: {
        ...baseApplication,
        company: "Friday AG",
        nextActionAt: "2026-10-18",
      },
    });
    const withHorizon = await applications.getDashboard(
      new Date("2026-10-15T10:00:00+02:00"),
    );
    expect(withHorizon.today).toBe("2026-10-15");
    expect(withHorizon.followUps.map((a) => a.id)).toEqual([due.id, soon.id]);
    expect(dashboard.total).toBe(3);
    expect(dashboard.byGroup).toEqual({ pending: 2, ongoing: 0, closed: 1 });
    expect(dashboard.byStatus.rejected).toBe(1);
    expect(dashboard.followUps.map((a) => a.id)).toEqual([due.id]);
  });

  it("filters by group and searches literally", async () => {
    await applications.createApplication({
      application: { ...baseApplication, company: "100% Remote GmbH" },
    });
    await applications.createApplication({
      application: { ...baseApplication, company: "Other AG" },
    });

    expect(
      (await applications.listApplications({ search: "100%" })).map(
        (a) => a.company,
      ),
    ).toEqual(["100% Remote GmbH"]);
    // "%" alone must not act as a wildcard matching everything.
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
    await applications.createApplication({
      application: { ...baseApplication, resumeId: resume.id },
    });
    await expect(files.deleteFile(resume.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect((await files.listResumes())[0].uses).toBe(1);
  });

  it("deletes attachments with their application", async () => {
    const { id } = await applications.createApplication(
      { application: baseApplication },
      { attachments: [pngFile()] },
    );
    const [attachment] = (await applications.getApplication(id))!.attachments;
    await applications.deleteApplication(id);
    expect(await files.openFile(attachment.id)).toBeNull();
  });
});

describe("contacts", () => {
  it("keeps applications when their contact is deleted", async () => {
    const contact = await contacts.createContact({
      name: "Recruiter",
      email: "r@agency.ch",
    });
    const { id } = await applications.createApplication({
      application: { ...baseApplication, contactId: contact.id },
    });
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
