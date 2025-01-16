CREATE TABLE IF NOT EXISTS "affected_pdna" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dsg_id" uuid NOT NULL,
	"primarily" integer,
	"secondary" integer,
	"tertiary" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "affected_sendai" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dsg_id" uuid NOT NULL,
	"direct" integer,
	"indirect" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_key" (
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "api_key_secret_unique" UNIQUE("secret")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commonPasswords" (
	"password" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "country1" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "death" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dsg_id" uuid NOT NULL,
	"deaths" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_example1" (
	"api_import_id" text,
	"id" serial PRIMARY KEY NOT NULL,
	"field1" text NOT NULL,
	"field2" text NOT NULL,
	"field3" integer NOT NULL,
	"field4" integer,
	"field5" timestamp,
	"field6" text DEFAULT 'one' NOT NULL,
	CONSTRAINT "dev_example1_api_import_id_unique" UNIQUE("api_import_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disaster_event" (
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approvalStatus" text DEFAULT 'pending' NOT NULL,
	"api_import_id" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"hazard_event_id" uuid NOT NULL,
	"national_disaster_id" text DEFAULT '' NOT NULL,
	"other_id1" text DEFAULT '' NOT NULL,
	"glide" text DEFAULT '' NOT NULL,
	"name_global_or_regional" text DEFAULT '' NOT NULL,
	"name_national" text DEFAULT '' NOT NULL,
	"start_date_utc" timestamp,
	"end_date_utc" timestamp,
	"start_date_local" timestamp,
	"end_date_local" timestamp,
	"duration_days" integer,
	"affected_geographic_divisions" text DEFAULT '' NOT NULL,
	"affected_administrative_regions" text DEFAULT '' NOT NULL,
	"disaster_declaration" boolean DEFAULT false NOT NULL,
	"disaster_declaration_type" boolean DEFAULT false NOT NULL,
	"disaster_declaration_effect" boolean DEFAULT false NOT NULL,
	"disaster_declaration_date" timestamp,
	"warning_issued_levels_severity" text DEFAULT '' NOT NULL,
	"warning_issued_date" timestamp,
	"preliminary_assesment_date" timestamp,
	"response_oprations" text DEFAULT '' NOT NULL,
	"post_disaster_assessment_date" timestamp,
	"re_assessment_date" timestamp,
	"data_source" text DEFAULT '' NOT NULL,
	"originator_recorder_of_information" text DEFAULT '' NOT NULL,
	"effects_total_local_currency" integer,
	"effects_total_usd" integer,
	"subtotal_damage_usd" integer,
	"subtotal_losses_usd" integer,
	"response_cost_total" integer,
	"humanitarian_needs_total" integer,
	"recovery_needs_total" integer,
	CONSTRAINT "disaster_event_api_import_id_unique" UNIQUE("api_import_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "displaced" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dsg_id" uuid NOT NULL,
	"short_term" integer,
	"medium_short" integer,
	"medium_long" integer,
	"long_term" integer,
	"permanent" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "displacement_flows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"displaced" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "displacement_stocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dsg_id" uuid NOT NULL,
	"preemptive" integer,
	"reactive" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "division" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" text,
	"parent_id" integer,
	"name" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"geojson" jsonb,
	CONSTRAINT "division_import_id_unique" UNIQUE("import_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_relationship" (
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"type" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"example" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hazard_event" (
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approvalStatus" text DEFAULT 'pending' NOT NULL,
	"api_import_id" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"hazard_id" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"otherId1" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"chains_explanation" text DEFAULT '' NOT NULL,
	"duration" text DEFAULT '' NOT NULL,
	"magniture" text DEFAULT '' NOT NULL,
	"spatial_footprint" text DEFAULT '' NOT NULL,
	"record_originator" text DEFAULT '' NOT NULL,
	"data_source" text DEFAULT '' NOT NULL,
	CONSTRAINT "hazard_event_api_import_id_unique" UNIQUE("api_import_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hip_class" (
	"id" integer PRIMARY KEY NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	CONSTRAINT "name_en_not_empty" CHECK ("hip_class"."name_en" <> '')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hip_cluster" (
	"id" integer PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	CONSTRAINT "name_en_not_empty" CHECK ("hip_cluster"."name_en" <> '')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hip_hazard" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" integer NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	CONSTRAINT "name_en_not_empty" CHECK ("hip_hazard"."name_en" <> ''),
	CONSTRAINT "description_en_not_empty" CHECK ("hip_hazard"."description_en" <> '')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "human_dsg" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sex" text,
	"age" integer,
	"disability" boolean,
	"custom" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "injured" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dsg_id" uuid NOT NULL,
	"injured" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resource_repo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"approvalStatus" text DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rr_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_repo_id" uuid NOT NULL,
	"type" text DEFAULT 'document' NOT NULL,
	"type_other_desc" text,
	"filename" text,
	"url" text,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"last_active_at" timestamp DEFAULT '2000-01-01T00:00:00.000Z' NOT NULL,
	"totp_authed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_code" text DEFAULT '' NOT NULL,
	"email_verification_sent_at" timestamp,
	"email_verification_expires_at" timestamp DEFAULT '2000-01-01T00:00:00.000Z' NOT NULL,
	"invite_code" text DEFAULT '' NOT NULL,
	"invite_sent_at" timestamp,
	"invite_expires_at" timestamp DEFAULT '2000-01-01T00:00:00.000Z' NOT NULL,
	"reset_password_token" text DEFAULT '' NOT NULL,
	"reset_password_expires_at" timestamp DEFAULT '2000-01-01T00:00:00.000Z' NOT NULL,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"totp_secret" text DEFAULT '' NOT NULL,
	"totp_secret_url" text DEFAULT '' NOT NULL,
	"organization" text DEFAULT '' NOT NULL,
	"hydromet_che_user" boolean DEFAULT false NOT NULL,
	"auth_type" text DEFAULT 'form' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "affected_pdna" ADD CONSTRAINT "affected_pdna_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "affected_pdna" ADD CONSTRAINT "affected_pdna_dsg_id_human_dsg_id_fk" FOREIGN KEY ("dsg_id") REFERENCES "public"."human_dsg"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "affected_sendai" ADD CONSTRAINT "affected_sendai_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "affected_sendai" ADD CONSTRAINT "affected_sendai_dsg_id_human_dsg_id_fk" FOREIGN KEY ("dsg_id") REFERENCES "public"."human_dsg"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "death" ADD CONSTRAINT "death_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "death" ADD CONSTRAINT "death_dsg_id_human_dsg_id_fk" FOREIGN KEY ("dsg_id") REFERENCES "public"."human_dsg"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disaster_event" ADD CONSTRAINT "disaster_event_id_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disaster_event" ADD CONSTRAINT "disaster_event_hazard_event_id_hazard_event_id_fk" FOREIGN KEY ("hazard_event_id") REFERENCES "public"."hazard_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "displaced" ADD CONSTRAINT "displaced_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "displaced" ADD CONSTRAINT "displaced_dsg_id_human_dsg_id_fk" FOREIGN KEY ("dsg_id") REFERENCES "public"."human_dsg"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "displacement_flows" ADD CONSTRAINT "displacement_flows_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "displacement_stocks" ADD CONSTRAINT "displacement_stocks_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "displacement_stocks" ADD CONSTRAINT "displacement_stocks_dsg_id_human_dsg_id_fk" FOREIGN KEY ("dsg_id") REFERENCES "public"."human_dsg"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "division" ADD CONSTRAINT "division_parent_id_division_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."division"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_relationship" ADD CONSTRAINT "event_relationship_parent_id_event_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_relationship" ADD CONSTRAINT "event_relationship_child_id_event_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hazard_event" ADD CONSTRAINT "hazard_event_id_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hazard_event" ADD CONSTRAINT "hazard_event_hazard_id_hip_hazard_id_fk" FOREIGN KEY ("hazard_id") REFERENCES "public"."hip_hazard"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hip_cluster" ADD CONSTRAINT "hip_cluster_class_id_hip_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."hip_class"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hip_hazard" ADD CONSTRAINT "hip_hazard_cluster_id_hip_cluster_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."hip_cluster"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "human_dsg" ADD CONSTRAINT "human_dsg_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "injured" ADD CONSTRAINT "injured_id_disaster_event_id_fk" FOREIGN KEY ("id") REFERENCES "public"."disaster_event"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "injured" ADD CONSTRAINT "injured_dsg_id_human_dsg_id_fk" FOREIGN KEY ("dsg_id") REFERENCES "public"."human_dsg"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rr_attachments" ADD CONSTRAINT "rr_attachments_resource_repo_id_resource_repo_id_fk" FOREIGN KEY ("resource_repo_id") REFERENCES "public"."resource_repo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_idx" ON "division" USING btree ("parent_id");