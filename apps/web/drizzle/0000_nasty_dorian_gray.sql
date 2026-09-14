CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'manager', 'observer');--> statement-breakpoint
CREATE TYPE "public"."election_state" AS ENUM('draft', 'scheduled', 'open', 'closed', 'published');--> statement-breakpoint
CREATE TYPE "public"."eligibility_status" AS ENUM('eligible', 'voted', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('processing', 'validated', 'committed', 'failed');--> statement-breakpoint
CREATE TABLE "admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_admin_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" NOT NULL,
	"force_password_change" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_key" text NOT NULL,
	"action" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"cooldown_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_rate_limits_scope_action_unique" UNIQUE("scope_type","scope_key","action")
);
--> statement-breakpoint
CREATE TABLE "ballot_votes" (
	"ballot_id" uuid NOT NULL,
	"election_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ballot_votes_ballot_id_position_id_pk" PRIMARY KEY("ballot_id","position_id")
);
--> statement-breakpoint
CREATE TABLE "ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid NOT NULL,
	"receipt_token_hash" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ballots_id_election_id_unique" UNIQUE("id","election_id")
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"manifesto" text NOT NULL,
	"image_public_id" text,
	"image_url" text,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_position_order_unique" UNIQUE("position_id","display_order"),
	CONSTRAINT "candidates_position_id_id_unique" UNIQUE("position_id","id")
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_name" text NOT NULL,
	"title" text NOT NULL,
	"timezone" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"state" "election_state" DEFAULT 'draft' NOT NULL,
	"closed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_by_admin_id" uuid,
	"updated_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "elections_id_state_unique" UNIQUE("id","state"),
	CONSTRAINT "elections_end_after_start" CHECK ("elections"."ends_at" > "elections"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eligibility_id" uuid NOT NULL,
	"otp_hash" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"verified_at" timestamp with time zone,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_election_name_unique" UNIQUE("election_id","name"),
	CONSTRAINT "positions_election_order_unique" UNIQUE("election_id","display_order"),
	CONSTRAINT "positions_election_id_id_unique" UNIQUE("election_id","id")
);
--> statement-breakpoint
CREATE TABLE "student_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid NOT NULL,
	"matric_number" text NOT NULL,
	"full_name" text NOT NULL,
	"school_email" text NOT NULL,
	"level" text,
	"import_id" uuid,
	"status" "eligibility_status" DEFAULT 'eligible' NOT NULL,
	"voted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_eligibility_election_matric_unique" UNIQUE("election_id","matric_number"),
	CONSTRAINT "student_eligibility_election_email_unique" UNIQUE("election_id","school_email")
);
--> statement-breakpoint
CREATE TABLE "voter_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid NOT NULL,
	"uploaded_by_admin_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"checksum" text NOT NULL,
	"validation_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"accepted_rows" integer DEFAULT 0 NOT NULL,
	"rejected_rows" integer DEFAULT 0 NOT NULL,
	"status" "import_status" DEFAULT 'processing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "voter_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eligibility_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_actor_admin_id_admins_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_password_reset_tokens" ADD CONSTRAINT "admin_password_reset_tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_votes" ADD CONSTRAINT "ballot_votes_ballot_election_fk" FOREIGN KEY ("ballot_id","election_id") REFERENCES "public"."ballots"("id","election_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_votes" ADD CONSTRAINT "ballot_votes_election_position_fk" FOREIGN KEY ("election_id","position_id") REFERENCES "public"."positions"("election_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_votes" ADD CONSTRAINT "ballot_votes_position_candidate_fk" FOREIGN KEY ("position_id","candidate_id") REFERENCES "public"."candidates"("position_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elections" ADD CONSTRAINT "elections_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elections" ADD CONSTRAINT "elections_updated_by_admin_id_admins_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_eligibility_id_student_eligibility_id_fk" FOREIGN KEY ("eligibility_id") REFERENCES "public"."student_eligibility"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_eligibility" ADD CONSTRAINT "student_eligibility_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_eligibility" ADD CONSTRAINT "student_eligibility_import_id_voter_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."voter_imports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voter_imports" ADD CONSTRAINT "voter_imports_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voter_imports" ADD CONSTRAINT "voter_imports_uploaded_by_admin_id_admins_id_fk" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voter_sessions" ADD CONSTRAINT "voter_sessions_eligibility_id_student_eligibility_id_fk" FOREIGN KEY ("eligibility_id") REFERENCES "public"."student_eligibility"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_events_actor_created_idx" ON "admin_audit_events" USING btree ("actor_admin_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_reset_tokens_hash_unique" ON "admin_password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_reset_tokens_admin_id_idx" ON "admin_password_reset_tokens" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_unique" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admins_username_unique" ON "admins" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ballot_votes_candidate_id_idx" ON "ballot_votes" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ballots_receipt_token_hash_unique" ON "ballots" USING btree ("receipt_token_hash");--> statement-breakpoint
CREATE INDEX "ballots_election_id_idx" ON "ballots" USING btree ("election_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_election" ON "elections" USING btree ("state") WHERE "elections"."state" = 'open';--> statement-breakpoint
CREATE INDEX "otp_challenges_eligibility_id_idx" ON "otp_challenges" USING btree ("eligibility_id");--> statement-breakpoint
CREATE INDEX "student_eligibility_lookup_idx" ON "student_eligibility" USING btree ("election_id","matric_number");--> statement-breakpoint
CREATE INDEX "voter_imports_election_id_idx" ON "voter_imports" USING btree ("election_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voter_sessions_token_hash_unique" ON "voter_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "voter_sessions_eligibility_id_idx" ON "voter_sessions" USING btree ("eligibility_id");