-- A step is a status change or an action ("reach_out"): the column holding the
-- status becomes the step's kind. Existing values are all status changes.
CREATE TYPE "public"."step_kind" AS ENUM('draft', 'applied', 'acknowledged', 'screening', 'interview_1', 'interview_2plus', 'assignment', 'offer', 'accepted', 'rejected', 'withdrawn', 'ghosted', 'reach_out');--> statement-breakpoint
ALTER TABLE "application_steps" RENAME COLUMN "status" TO "kind";--> statement-breakpoint
ALTER TABLE "application_steps" ALTER COLUMN "kind" SET DATA TYPE "step_kind" USING "kind"::text::"step_kind";
