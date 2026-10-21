import { describe, expect, it } from "vitest";
import * as applications from "@/server/services/application-service";
import * as contacts from "@/server/services/contact-service";
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
} from "@/server/services/errors";
import * as progress from "@/server/services/progress-service";
import { addDays, todayInAppTimeZone } from "@/lib/dates";
import { newApplication, pdfFile, pngFile } from "./helpers";

async function create(company = "Example Bank AG") {
  return (await applications.createApplication(newApplication({ company }))).id;
}

describe("steps", () => {
  it("derives the current status and next step as steps are added", async () => {
    const id = await create();
    await progress.addStep(id, {
      kind: "interview_1",
      title: "Technical round",
      date: "2026-10-20",
    });
    // Recorded later but happened earlier: must not become the current status.
    await progress.addStep(id, { kind: "acknowledged", date: "2026-10-12" });
    await progress.addStep(id, {
      kind: "interview_2plus",
      state: "planned",
      date: "2026-10-28",
    });
    await progress.addStep(id, { kind: "offer", state: "planned" });

    const detail = (await applications.getApplication(id))!;
    expect(detail.status).toBe("interview_1");
    expect(detail.statusGroup).toBe("ongoing");
    expect(detail.currentStep?.title).toBe("Technical round");
    expect(detail.nextStep?.kind).toBe("interview_2plus");
    expect(detail.steps.map((s) => s.kind)).toEqual([
      "applied",
      "acknowledged",
      "interview_1",
      "interview_2plus",
      "offer",
    ]);
  });

  it("turns a planned step into a done one, moving the status forward", async () => {
    const id = await create();
    const planned = await progress.addStep(id, {
      kind: "screening",
      state: "planned",
      date: "2026-10-15",
    });
    await progress.updateStep(planned.id, {
      kind: "screening",
      state: "done",
      date: "2026-10-15",
      note: "Went well",
    });
    const detail = (await applications.getApplication(id))!;
    expect(detail.status).toBe("screening");
    expect(detail.nextStep).toBeNull();
    expect(detail.currentStep?.note).toBe("Went well");
  });

  it("keeps at least one done step", async () => {
    const id = await create();
    const [only] = (await applications.getApplication(id))!.steps;
    await expect(progress.deleteStep(only.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(
      progress.updateStep(only.id, {
        kind: "applied",
        state: "planned",
        date: "2026-10-10",
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    await progress.addStep(id, { kind: "acknowledged", date: "2026-10-11" });
    await progress.deleteStep(only.id);
    expect((await applications.getApplication(id))!.status).toBe(
      "acknowledged",
    );
  });

  it("marks a planned step as done today", async () => {
    const id = await create();
    const planned = await progress.addStep(id, {
      kind: "screening",
      title: "Call with HR",
      state: "planned",
      date: "2026-10-30",
    });
    const done = await progress.completeStep(planned.id);
    expect(done).toMatchObject({
      state: "done",
      date: todayInAppTimeZone(),
      title: "Call with HR",
    });
    expect((await applications.getApplication(id))!.status).toBe("screening");
  });

  it("records reach-outs without changing the status", async () => {
    const id = await create();
    await progress.addStep(id, { kind: "acknowledged", date: "2026-10-12" });
    await progress.addStep(id, {
      kind: "reach_out",
      title: "Pinged the recruiter",
      date: "2026-10-19",
    });
    const ping = await progress.addStep(id, {
      kind: "reach_out",
      state: "planned",
      date: "2026-10-26",
    });

    const detail = (await applications.getApplication(id))!;
    expect(detail.status).toBe("acknowledged");
    expect(detail.nextStep?.id).toBe(ping.id);
  });

  it("does not count actions as the status-defining step", async () => {
    const id = await create();
    const [applied] = (await applications.getApplication(id))!.steps;
    await progress.addStep(id, { kind: "reach_out", date: "2026-10-11" });
    await expect(progress.deleteStep(applied.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("validates input and unknown ids", async () => {
    const id = await create();
    await expect(progress.addStep(id, { kind: "done" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    await expect(
      progress.addStep(id, { kind: "screening", state: "done" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      progress.addStep(id, {
        kind: "reach_out",
        state: "done",
        date: addDays(todayInAppTimeZone(), 2),
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      progress.updateStep("00000000-0000-4000-8000-000000000000", {
        kind: "offer",
        state: "planned",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("notes", () => {
  it("adds, edits and deletes notes, newest first", async () => {
    const id = await create();
    const first = await progress.addNote(id, {
      body: "Call with HR: they want B2 German",
    });
    await progress.addNote(id, { body: "Salary range confirmed" });
    await progress.updateNote(first.id, {
      body: "Call with HR: they want B2 German, C1 is a plus",
    });

    let notes = (await applications.getApplication(id))!.notes;
    expect(notes.map((n) => n.body)).toEqual([
      "Salary range confirmed",
      "Call with HR: they want B2 German, C1 is a plus",
    ]);
    await progress.deleteNote(first.id);
    notes = (await applications.getApplication(id))!.notes;
    expect(notes).toHaveLength(1);
  });

  it("rejects empty notes", async () => {
    const id = await create();
    await expect(progress.addNote(id, { body: "  " })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
  });
});

describe("workspace", () => {
  it("returns every application with its panel data in one call", async () => {
    const contact = await contacts.createContact({ name: "Lena Brunner" });
    const { id } = await applications.createApplication(
      newApplication(
        { contactId: contact.id },
        { note: "Bring the portfolio" },
      ),
      { resumeFile: pdfFile(), attachments: [pngFile()] },
    );
    await progress.addStep(id, {
      kind: "interview_1",
      title: "Technical round",
      state: "planned",
      date: "2026-11-02",
    });
    const other = await create("Other AG");
    await progress.addStep(other, { kind: "rejected", date: "2026-10-20" });

    const workspace = await applications.getWorkspace();
    expect(workspace.applications).toHaveLength(2);
    expect(workspace.dashboard.byGroup).toEqual({
      pending: 1,
      ongoing: 0,
      closed: 1,
    });

    const app = workspace.applications.find((a) => a.id === id)!;
    expect(app).toMatchObject({
      status: "applied",
      contact: { name: "Lena Brunner" },
      resume: { kind: "resume" },
      nextStep: { title: "Technical round" },
      notes: [{ body: "Bring the portfolio" }],
    });
    expect(app.steps).toHaveLength(2);
    expect(app.attachments).toHaveLength(1);
    expect(JSON.stringify(workspace)).not.toMatch(/storageKey/);
    expect(workspace.options.contacts.map((c) => c.name)).toEqual([
      "Lena Brunner",
    ]);
  });
});
