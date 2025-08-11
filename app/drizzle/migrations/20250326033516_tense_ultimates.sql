ALTER TABLE "division" ADD COLUMN "national_id" text;--> statement-breakpoint
ALTER TABLE "division" ADD CONSTRAINT "division_national_id_unique" UNIQUE("national_id");