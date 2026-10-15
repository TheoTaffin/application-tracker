import { describe, expect, it } from "vitest";
import * as applications from "@/server/services/application-service";
import * as contacts from "@/server/services/contact-service";
import { InvalidInputError, NotFoundError } from "@/server/services/errors";
import * as progress from "@/server/services/progress-service";
import { baseApplication, pdfFile, pngFile } from "./helpers";

async function newApplication(company = "Example Bank AG") {
  return (
    await applications.createApplication({
      application: { ...baseApplication, company },
    })
  ).id;
}

describe("custom stages", () => {
  it("appends stages in order and keeps a single active one", async () => {
    const id = await newApplication();
    await progress.addStage(id, {
      name: "Recruiter screen",
      state: "passed",
      date: "2026-10-01",
    });
    const panel = await progress.addStage(id, {
      name: "Leadership panel",
      state: "active",
    });
    await progress.addStage(id, { name: "Offer review" });

    // Making another stage active turns the previous active one into "passed".
    const offer = (await applications.getApplication(id))!.stages[2];
    await progress.updateStage(offer.id, {
      name: "Offer review",
      state: "active",
    });

    const stages = (await applications.getApplication(id))!.stages;
    expect(stages.map((s) => [s.name, s.state])).toEqual([
      ["Recruiter screen", "passed"],
      ["Leadership panel", "passed"],
      ["Offer review", "active"],
    ]);
    expect(stages.find((s) => s.id === panel.id)?.state).toBe("passed");
  });

  it("reorders and deletes stages", async () => {
    const id = await newApplication();
    const a = await progress.addStage(id, { name: "A" });
    await progress.addStage(id, { name: "B" });
    await progress.moveStage(a.id, "down");
    await progress.moveStage(a.id, "down"); // already last: no-op
    expect(
      (await applications.getApplication(id))!.stages.map((s) => s.name),
    ).toEqual(["B", "A"]);
    await progress.deleteStage(a.id);
    expect(
      (await applications.getApplication(id))!.stages.map((s) => s.name),
    ).toEqual(["B"]);
  });

  it("validates input and unknown ids", async () => {
    const id = await newApplication();
    await expect(progress.addStage(id, { name: " " })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    await expect(
      progress.addStage(id, { name: "X", state: "done" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      progress.updateStage("00000000-0000-4000-8000-000000000000", {
        name: "X",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("notes", () => {
  it("adds, edits and deletes notes, newest first", async () => {
    const id = await newApplication();
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
    const id = await newApplication();
    await expect(progress.addNote(id, { body: "  " })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
  });

  it("are deleted with their application", async () => {
    const id = await newApplication();
    const note = await progress.addNote(id, { body: "x" });
    await applications.deleteApplication(id);
    await expect(progress.deleteNote(note.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("workspace", () => {
  it("returns every application with its panel data in one call", async () => {
    const contact = await contacts.createContact({ name: "Lena Brunner" });
    const { id } = await applications.createApplication(
      { application: { ...baseApplication, contactId: contact.id } },
      { resumeFile: pdfFile(), attachments: [pngFile()] },
    );
    await progress.addStage(id, { name: "Technical round", state: "active" });
    await progress.addNote(id, { body: "Bring the portfolio" });
    const other = await newApplication("Other AG");
    await applications.addStatusUpdate(other, { status: "rejected" });

    const workspace = await applications.getWorkspace();
    expect(workspace.applications).toHaveLength(2);
    expect(workspace.dashboard.byGroup).toEqual({
      pending: 1,
      ongoing: 0,
      closed: 1,
    });

    const app = workspace.applications.find((a) => a.id === id)!;
    expect(app).toMatchObject({
      contact: { name: "Lena Brunner" },
      resume: { kind: "resume" },
      activeStage: { name: "Technical round" },
      notes: [{ body: "Bring the portfolio" }],
    });
    expect(app.attachments).toHaveLength(1);
    expect(app.events.map((e) => e.status)).toEqual(["applied"]);
    expect(JSON.stringify(workspace)).not.toMatch(/storageKey/);
    expect(workspace.options.contacts.map((c) => c.name)).toEqual([
      "Lena Brunner",
    ]);
  });
});
