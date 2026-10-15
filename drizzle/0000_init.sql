CREATE TYPE "public"."application_source" AS ENUM('jobs_ch', 'jobup_ch', 'linkedin', 'company_site', 'referral', 'recruiter', 'other');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'applied', 'acknowledged', 'screening', 'interview_1', 'interview_2plus', 'assignment', 'offer', 'accepted', 'rejected', 'withdrawn', 'ghosted');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('resume', 'attachment');--> statement-breakpoint
CREATE TYPE "public"."posting_language" AS ENUM('de', 'fr', 'en', 'it');--> statement-breakpoint
CREATE TYPE "public"."status_event_source" AS ENUM('manual', 'gmail');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"description" text,
	"offer_url" text,
	"offer_snapshot" text,
	"offer_extracted" jsonb,
	"location" text,
	"workload_min" smallint,
	"workload_max" smallint,
	"salary_ask" integer,
	"language" "posting_language",
	"source" "application_source",
	"via_agency" boolean DEFAULT false NOT NULL,
	"form_answers" text,
	"resume_id" uuid,
	"contact_id" uuid,
	"applied_at" date,
	"next_action_at" date,
	"next_action_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_workload_range" CHECK (("applications"."workload_min" IS NULL OR "applications"."workload_min" BETWEEN 0 AND 100)
        AND ("applications"."workload_max" IS NULL OR "applications"."workload_max" BETWEEN 0 AND 100)
        AND ("applications"."workload_min" IS NULL OR "applications"."workload_max" IS NULL OR "applications"."workload_min" <= "applications"."workload_max")),
	CONSTRAINT "applications_salary_ask_positive" CHECK ("applications"."salary_ask" IS NULL OR "applications"."salary_ask" > 0)
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"role" text,
	"linkedin_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "file_kind" NOT NULL,
	"label" text NOT NULL,
	"original_name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"application_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_storageKey_unique" UNIQUE("storage_key"),
	CONSTRAINT "files_kind_matches_owner" CHECK (("files"."kind" = 'resume' AND "files"."application_id" IS NULL)
        OR ("files"."kind" = 'attachment' AND "files"."application_id" IS NOT NULL)),
	CONSTRAINT "files_size_positive" CHECK ("files"."size" > 0)
);
--> statement-breakpoint
CREATE TABLE "status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "application_status" NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" "status_event_source" DEFAULT 'manual' NOT NULL,
	"gmail_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "status_events_gmailMessageId_unique" UNIQUE("gmail_message_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_files_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_next_action_at_index" ON "applications" USING btree ("next_action_at");--> statement-breakpoint
CREATE INDEX "applications_contact_id_index" ON "applications" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "applications_resume_id_index" ON "applications" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "files_application_id_index" ON "files" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "status_events_application_id_occurred_at_created_at_index" ON "status_events" USING btree ("application_id","occurred_at" DESC NULLS LAST,"created_at" DESC NULLS LAST);
