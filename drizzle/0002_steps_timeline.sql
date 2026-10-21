-- Status events and custom stages become one timeline of steps (application_steps).
-- Existing data is carried over before the old tables and columns are dropped:
--   status_events            -> done steps (dated in Swiss local time)
--   application_stages       -> steps named after the stage, with the application's status
--   applications.description -> first entry of the notes log
--   applications.next_action -> a planned step
--   applications.applied_at  -> an "applied" step, when no such step exists yet
CREATE TYPE "public"."step_source" AS ENUM('manual', 'gmail');--> statement-breakpoint
CREATE TYPE "public"."step_state" AS ENUM('done', 'planned', 'cancelled');--> statement-breakpoint
CREATE TABLE "application_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "application_status" NOT NULL,
	"title" text,
	"state" "step_state" DEFAULT 'done' NOT NULL,
	"date" date,
	"note" text,
	"source" "step_source" DEFAULT 'manual' NOT NULL,
	"gmail_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_steps_gmailMessageId_unique" UNIQUE("gmail_message_id"),
	CONSTRAINT "application_steps_done_has_date" CHECK ("application_steps"."state" <> 'done' OR "application_steps"."date" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "application_steps" ADD CONSTRAINT "application_steps_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_steps_application_id_date_index" ON "application_steps" USING btree ("application_id","date");--> statement-breakpoint
INSERT INTO "application_steps" ("application_id", "status", "state", "date", "note", "source", "gmail_message_id", "created_at", "updated_at")
SELECT "application_id", "status", 'done', ("occurred_at" AT TIME ZONE 'Europe/Zurich')::date, "note",
       "source"::text::"step_source", "gmail_message_id", "created_at", "created_at"
FROM "status_events";--> statement-breakpoint
INSERT INTO "application_steps" ("application_id", "status", "title", "state", "date", "note", "created_at", "updated_at")
SELECT s."application_id",
       (SELECT e."status" FROM "status_events" e WHERE e."application_id" = s."application_id"
        ORDER BY e."occurred_at" DESC, e."created_at" DESC LIMIT 1),
       s."name" || CASE WHEN s."state" = 'failed' THEN ' (failed)' ELSE '' END,
       CASE s."state" WHEN 'planned' THEN 'planned'::"step_state" WHEN 'cancelled' THEN 'cancelled'::"step_state" ELSE 'done'::"step_state" END,
       CASE WHEN s."state" IN ('passed', 'active', 'failed') THEN COALESCE(s."date", s."created_at"::date) ELSE s."date" END,
       s."note", s."created_at", s."updated_at"
FROM "application_stages" s;--> statement-breakpoint
INSERT INTO "application_notes" ("application_id", "body", "created_at", "updated_at")
SELECT "id", "description", "created_at", "created_at"
FROM "applications" WHERE COALESCE(btrim("description"), '') <> '';--> statement-breakpoint
INSERT INTO "application_steps" ("application_id", "status", "title", "state", "date")
SELECT a."id",
       (SELECT e."status" FROM "status_events" e WHERE e."application_id" = a."id"
        ORDER BY e."occurred_at" DESC, e."created_at" DESC LIMIT 1),
       COALESCE(NULLIF(btrim(a."next_action_note"), ''), 'Follow up'), 'planned', a."next_action_at"
FROM "applications" a WHERE a."next_action_at" IS NOT NULL OR COALESCE(btrim(a."next_action_note"), '') <> '';--> statement-breakpoint
INSERT INTO "application_steps" ("application_id", "status", "state", "date")
SELECT a."id", 'applied', 'done', a."applied_at"
FROM "applications" a
WHERE a."applied_at" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "status_events" e WHERE e."application_id" = a."id" AND e."status" = 'applied');--> statement-breakpoint
DROP TABLE "application_stages" CASCADE;--> statement-breakpoint
DROP TABLE "status_events" CASCADE;--> statement-breakpoint
ALTER TABLE "applications" RENAME COLUMN "offer_snapshot" TO "job_description";--> statement-breakpoint
DROP INDEX "applications_next_action_at_index";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "applied_at";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "next_action_at";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "next_action_note";--> statement-breakpoint
DROP TYPE "public"."stage_state";--> statement-breakpoint
DROP TYPE "public"."status_event_source";
