import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** All timestamps are UTC (`timestamp with time zone`). */
const createdAt = timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull();

export const adminRole = pgEnum("admin_role", ["super_admin", "manager", "observer"]);
export const electionState = pgEnum("election_state", [
  "draft",
  "scheduled",
  "open",
  "closed",
  "published",
]);
export const importStatus = pgEnum("import_status", ["processing", "validated", "committed", "failed"]);
export const eligibilityStatus = pgEnum("eligibility_status", ["eligible", "voted", "disabled"]);

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: adminRole("role").notNull(),
    forcePasswordChange: boolean("force_password_change").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("admins_username_unique").on(table.username),
    uniqueIndex("admins_email_unique").on(table.email),
  ],
);

export const adminPasswordResetTokens = pgTable(
  "admin_password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [uniqueIndex("admin_reset_tokens_hash_unique").on(table.tokenHash), index("admin_reset_tokens_admin_id_idx").on(table.adminId)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [uniqueIndex("admin_sessions_token_hash_unique").on(table.tokenHash), index("admin_sessions_admin_id_idx").on(table.adminId)],
);

export const elections = pgTable(
  "elections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentName: text("department_name").notNull(),
    title: text("title").notNull(),
    timezone: text("timezone").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    state: electionState("state").default("draft").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByAdminId: uuid("created_by_admin_id").references(() => admins.id, { onDelete: "restrict" }),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => admins.id, { onDelete: "restrict" }),
    createdAt,
    updatedAt,
  },
  (table) => [
    check("elections_end_after_start", sql`${table.endsAt} > ${table.startsAt}`),
    // PostgreSQL partial index: the platform permits only one election to be open.
    uniqueIndex("one_open_election").on(table.state).where(sql`${table.state} = 'open'`),
    unique("elections_id_state_unique").on(table.id, table.state),
  ],
);

export const positions = pgTable(
  "positions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    electionId: uuid("election_id").notNull().references(() => elections.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("positions_election_name_unique").on(table.electionId, table.name),
    unique("positions_election_order_unique").on(table.electionId, table.displayOrder),
    unique("positions_election_id_id_unique").on(table.electionId, table.id),
  ],
);

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    positionId: uuid("position_id").notNull().references(() => positions.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    manifesto: text("manifesto").notNull(),
    imagePublicId: text("image_public_id"),
    imageUrl: text("image_url"),
    displayOrder: integer("display_order").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("candidates_position_order_unique").on(table.positionId, table.displayOrder),
    unique("candidates_position_id_id_unique").on(table.positionId, table.id),
  ],
);

export const voterImports = pgTable(
  "voter_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    electionId: uuid("election_id").notNull().references(() => elections.id, { onDelete: "restrict" }),
    uploadedByAdminId: uuid("uploaded_by_admin_id").notNull().references(() => admins.id, { onDelete: "restrict" }),
    originalFilename: text("original_filename").notNull(),
    checksum: text("checksum").notNull(),
    validationSummary: jsonb("validation_summary").notNull().default({}),
    acceptedRows: integer("accepted_rows").default(0).notNull(),
    rejectedRows: integer("rejected_rows").default(0).notNull(),
    status: importStatus("status").default("processing").notNull(),
    createdAt,
    committedAt: timestamp("committed_at", { withTimezone: true }),
  },
  (table) => [index("voter_imports_election_id_idx").on(table.electionId)],
);

export const studentEligibility = pgTable(
  "student_eligibility",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    electionId: uuid("election_id").notNull().references(() => elections.id, { onDelete: "restrict" }),
    matricNumber: text("matric_number").notNull(),
    fullName: text("full_name").notNull(),
    schoolEmail: text("school_email").notNull(),
    level: text("level"),
    importId: uuid("import_id").references(() => voterImports.id, { onDelete: "restrict" }),
    status: eligibilityStatus("status").default("eligible").notNull(),
    votedAt: timestamp("voted_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("student_eligibility_election_matric_unique").on(table.electionId, table.matricNumber),
    unique("student_eligibility_election_email_unique").on(table.electionId, table.schoolEmail),
    index("student_eligibility_lookup_idx").on(table.electionId, table.matricNumber),
  ],
);

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eligibilityId: uuid("eligibility_id").notNull().references(() => studentEligibility.id, { onDelete: "cascade" }),
    otpHash: text("otp_hash").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [index("otp_challenges_eligibility_id_idx").on(table.eligibilityId)],
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scopeType: text("scope_type").notNull(),
    scopeKey: text("scope_key").notNull(),
    action: text("action").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    updatedAt,
  },
  (table) => [unique("auth_rate_limits_scope_action_unique").on(table.scopeType, table.scopeKey, table.action)],
);

export const voterSessions = pgTable(
  "voter_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eligibilityId: uuid("eligibility_id").notNull().references(() => studentEligibility.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [uniqueIndex("voter_sessions_token_hash_unique").on(table.tokenHash), index("voter_sessions_eligibility_id_idx").on(table.eligibilityId)],
);

/** Deliberately has no foreign key to a voter, session, or eligibility record. */
export const ballots = pgTable(
  "ballots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    electionId: uuid("election_id").notNull().references(() => elections.id, { onDelete: "restrict" }),
    receiptTokenHash: text("receipt_token_hash").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ballots_receipt_token_hash_unique").on(table.receiptTokenHash),
    unique("ballots_id_election_id_unique").on(table.id, table.electionId),
    index("ballots_election_id_idx").on(table.electionId),
  ],
);

export const ballotVotes = pgTable(
  "ballot_votes",
  {
    ballotId: uuid("ballot_id").notNull(),
    electionId: uuid("election_id").notNull(),
    positionId: uuid("position_id").notNull(),
    candidateId: uuid("candidate_id").notNull(),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.ballotId, table.positionId] }),
    // These composite FKs ensure every recorded vote belongs to its ballot's
    // election and that its candidate belongs to its selected position.
    // No voter-related table is reachable from this graph.
    foreignKey({
      columns: [table.ballotId, table.electionId],
      foreignColumns: [ballots.id, ballots.electionId],
      name: "ballot_votes_ballot_election_fk",
    }),
    foreignKey({
      columns: [table.electionId, table.positionId],
      foreignColumns: [positions.electionId, positions.id],
      name: "ballot_votes_election_position_fk",
    }),
    foreignKey({
      columns: [table.positionId, table.candidateId],
      foreignColumns: [candidates.positionId, candidates.id],
      name: "ballot_votes_position_candidate_fk",
    }),
    index("ballot_votes_candidate_id_idx").on(table.candidateId),
  ],
);

export const adminAuditEvents = pgTable(
  "admin_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorAdminId: uuid("actor_admin_id").references(() => admins.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    reason: text("reason"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt,
  },
  (table) => [index("admin_audit_events_actor_created_idx").on(table.actorAdminId, table.createdAt)],
);
