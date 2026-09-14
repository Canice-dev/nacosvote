# Department Election Platform - Implementation Plan

## 1. Product scope

Build a department-only election system with separate web and mobile applications in `apps/`:

- **Student web app:** Next.js, deployed to Vercel.
- **Student/mobile admin app:** React Native with Expo SDK 57, published to Google Play and Apple App Store.
- **Admin web dashboard:** Next.js, used for all election operations.

The v1 product supports one department election at a time, for up to 5,000 eligible students. Students authenticate with their matric number and an OTP delivered to their imported school email, then cast one final secret ballot during an election window. Administrators cannot vote.

Out of scope for v1: multiple simultaneous elections, changing ballots after submission, in-app support tickets, push notifications, campaign social/media pages, department-mixed voter lists, and real-time results while voting is open.

## 2. Roles and access

| Role             | Web                                                                                                             | Mobile                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Student          | Authenticate, view candidates, vote once, receive confirmation, view published results                          | Same capabilities as web |
| Observer         | View closed/published results and approved exports                                                              | View results only        |
| Election manager | Import voters; manage candidates/positions; schedule, preview, open/close, publish, and export election results | View results only        |
| Super admin      | All election-manager capabilities plus create, deactivate, reset, and assign admin accounts                     | View results only        |

Admin accounts are pre-created. First sign-in requires a password change; password reset uses the individual admin's verified email. Admin roles are mutually exclusive with student voting eligibility.

## 3. Core voter journey

1. A student opens either client and is shown the concise privacy notice, eligibility statement, and election-support contact.
2. The student enters their matric number.
3. The server looks up the imported eligibility record. If no record, invalid email, duplicate email, closed election, or an already-used matric number is found, access is denied with a safe support message.
4. The system sends a six-digit OTP to the imported school email through Resend.
5. The student verifies the OTP. It expires in 10 minutes; verification allows five attempts; resend and login attempts use server-side Neon-backed counters and cooldowns.
6. The student receives a secure session lasting up to 24 hours or the election closing time, whichever arrives first.
7. The ballot shows every position, its candidates, photo, and short manifesto. The student must select exactly one candidate per position.
8. Before submit, the app shows a complete review screen and a clear warning that the ballot is final.
9. A single atomic server operation records the anonymous ballot and marks the eligibility record as voted. The client receives a non-revealing confirmation/receipt.
10. After the election is closed and an authorized administrator publishes results, students can view final candidates, winners, and vote totals.

## 4. Election rules and integrity

- Configure exactly one active department election at a time with title, timezone, start/end timestamps, status, positions, and candidates.
- Election states: draft → scheduled → open → closed → results published. Only a manager or super admin can transition valid states.
- Managers may set up and preview draft/scheduled elections. Opening an election locks positions, candidates, and the voter register. Managers may close early; each sensitive action requires a recorded reason and audit entry.
- A submitted ballot is irreversible. One matric number can vote once.
- Highest vote total wins each position. A tie is explicitly marked for an offline department decision; the app never chooses a winner for a tie.
- Results remain inaccessible to all admin roles until the election has closed. Publishing is a separate deliberate action.
- Do not store a voter identity alongside any ballot selections. Store eligibility/voting status separately from anonymous ballot and vote records; enforce this separation in server APIs and export queries.
- All changes to accounts, voter imports, candidates, schedules, state transitions, result publication, and exports create an immutable audit event with actor, action, timestamp, affected resource, and reason when required.

## 5. Data model

Use Neon Postgres through Drizzle migrations. Store timestamps in UTC and render them in the election's configured timezone.

### Identity and administration

- `admins`: id, username, email, password hash, role (`super_admin`, `manager`, `observer`), force-password-change flag, active status, timestamps.
- `admin_password_reset_tokens`: hashed token, admin id, expiration, consumed timestamp.
- `admin_sessions`: session identifier/hash, admin id, expiry, revocation timestamp.
- `admin_audit_events`: actor admin id, action type, entity type/id, metadata, reason, IP/device metadata only if approved by privacy policy, timestamp.

### Election configuration and eligibility

- `elections`: id, department name, title, timezone, start/end timestamps, state, closed/published timestamps, created/updated metadata.
- `positions`: election id, name, display order.
- `candidates`: position id, full name, Cloudinary image public ID/URL, short manifesto, display order, active status.
- `student_eligibility`: election id, matric number (unique within election), full name, school email, level, import batch id, status, voted timestamp. Keep the unique `election_id + matric_number` constraint.
- `voter_imports`: election id, original filename, uploader id, import timestamps, row totals, validation failures, checksum, status.

### Authentication and secret ballot

- `otp_challenges`: eligibility id, OTP hash, sent/expiry timestamps, failed-attempt count, verified/consumed timestamp. Never store plaintext OTPs.
- `auth_rate_limits`: scoped counter/cooldown records for matric number, normalized IP, and admin username/email actions.
- `voter_sessions`: opaque session identifier/hash, eligibility id, expiry/revocation timestamps.
- `ballots`: anonymous id, election id, submitted timestamp, receipt token/hash. It contains no eligibility or student foreign key.
- `ballot_votes`: anonymous ballot id, position id, candidate id; unique `(ballot_id, position_id)`.

Use a single database transaction with appropriate row locking/uniqueness checks when submitting a ballot, so retries and simultaneous requests cannot create duplicate votes. Do not expose ballot IDs or internal receipt data to administrators.

## 6. Monorepo architecture

Use a TypeScript monorepo with a workspace package manager selected during scaffolding (default: pnpm).

- `apps/web`: Next.js App Router application containing the student web experience and role-protected admin dashboard.
- `apps/mobile`: Expo SDK 57 React Native application for student voting and mobile admin results viewing.
- `packages/api`: framework-independent request validation, authorization, election rules, query/service layer, and typed API contracts shared by both clients.
- `packages/db`: Drizzle schema, migration configuration, Neon connection, transactional repository helpers, and test fixtures.
- `packages/ui` / `packages/config`: only shared tokens, types, validation schemas, and non-platform-specific utilities; keep web and native visual components separate where platform behavior differs.

Expose the backend through versioned HTTPS JSON endpoints implemented in Next.js route handlers/server actions where appropriate. Mobile must consume the same typed public API; all election rules, authorization, OTP generation, rate limits, and ballot submission remain server-side. Validate every external input using shared schemas.

### Provider responsibilities

- **Vercel:** deploy Next.js web/API and environment configuration.
- **Neon:** PostgreSQL database and branch-per-environment database isolation.
- **Drizzle:** schema, migrations, typed database access, and transactions.
- **Resend:** transactional student OTP and administrator password-reset email only.
- **Cloudinary:** candidate portraits; upload via server-authorized, constrained signed uploads. Restrict file type, size, dimensions, and transformations.
- **Expo/EAS:** native builds, signing, store delivery, and optional over-the-air updates after native-review-safe configuration.
- **Error monitoring:** select a free-tier provider during implementation and capture client/server exceptions without recording OTPs, passwords, or ballot choices.

## 7. API and client contracts

Implement a small, explicit API surface:

- Student: start OTP, verify OTP, fetch active election/ballot, submit ballot, fetch published results, sign out.
- Admin authentication: sign in, first-login password change, request/reset password, sign out.
- Admin management: list/create/deactivate/reset/role-update administrator accounts (super admin only).
- Election management: read/create/update draft election; upload/validate/commit CSV import; CRUD positions/candidates; upload candidate portrait; preview; schedule/open/close; publish results; get/export results and audit report.
- Results: aggregate candidate totals, turnout, tie status, and publication status. Never return identity-to-selection data.

Use opaque, secure, HTTP-only cookies for web sessions and platform-secure storage for mobile session credentials. Secure all endpoints with role checks, CSRF protections for cookie-authenticated mutations, strict origin/CORS configuration, input limits, and generic error messages that do not reveal whether an unverified matric/email exists.

## 8. CSV import workflow

Accept a department-only CSV with the required headers: `matric_number`, `full_name`, `school_email`, and `level`.

1. Upload to a draft/scheduled election.
2. Normalize matric numbers and email case/whitespace; validate headers, required values, email formatting, duplicates in the file, and duplicates against existing election records.
3. Present a review with accepted rows and actionable rejected-row errors.
4. Manager explicitly commits the import; retain its checksum, summary, and audit event.
5. Permit replacement/re-import only before the election opens. Lock the eligibility register when the election opens.

## 9. Security, privacy, and resilience

- Display and require acknowledgement of a concise privacy notice before login: data collected, OTP purpose, secret-ballot protection, one-year personal-data retention, aggregate-results retention, support contact, and policy link.
- Retain eligibility, OTP/security, and audit records for one year; purge/anonymize personal/OTP data on schedule while keeping aggregate anonymous results and necessary non-identifying audit summaries.
- Use Argon2id or an equivalent modern password hash for admins, hashed opaque session tokens, hashed OTPs, secure random token generation, and secret rotation through environment variables.
- Enforce Neon-backed limits/cooldowns for OTP requests, OTP verification, and admin login/reset endpoints. Limit at matric, account, and IP scopes without permanently locking voters from support recovery.
- Make all critical mutations idempotent using request/operation keys where clients can retry, especially OTP sending, CSV commits, ballot submission, opening/closing, and publishing.
- Give voters clear states for slow networks, expired sessions, expired OTPs, closed elections, already-submitted ballots, and failed submissions. A ballot client must never claim success until the server confirms its committed transaction.
- Never place Resend, Neon, Cloudinary signing, admin, or secret keys in mobile bundles or public client variables.

## 10. Results, reporting, and observability

- Calculate results server-side from anonymous ballots only after closure; cache only non-sensitive aggregates and invalidate them after a valid state transition.
- Let authorized admins download final totals, turnout, winners/ties, and a non-sensitive audit report. Exports never include ballot selections paired with matric numbers or voter names.
- Record application errors, server errors, OTP delivery/verification outcome counts, voter funnel counts, submission conflicts, rate-limit events, and audit-sensitive admin actions.
- Configure actionable alerts for failed OTP delivery spikes, abnormal verification failures, ballot-submit errors, database/API outage, and approaching free-tier quota limits.
- Use structured logs with redaction for passwords, OTPs, bearer/session tokens, raw school emails where unnecessary, and ballot selections.

## 11. Environments and release delivery

- Create isolated local, staging, and production environments with separate Neon databases, Resend identities/keys, Cloudinary folders/credentials, Vercel variables, and Expo application identifiers/configurations as needed.
- Seed staging only with synthetic students/candidates; never copy production student records into it.
- Protect production database migration, election-opening, closure, and publication operations with deployment approvals and backups/rollback procedures.
- Set up continuous integration to type-check, lint, test, build web, validate Expo configuration, run Drizzle migration checks, and scan for accidentally committed secrets.
- Submit mobile builds to Google Play and Apple App Store early enough for review. Prepare privacy policy URL, support contact, store data-safety/privacy disclosures, screenshots, signing credentials, app identifiers, and app-review test instructions.

## 12. Testing and rehearsal

### Automated tests

- Unit tests: election-state transitions, role permissions, winner/tie calculation, CSV normalization/validation, OTP expiry/attempt rules, rate limits, session expiry, privacy-safe result shaping, and retention rules.
- Integration tests: Drizzle migrations, concurrent one-vote enforcement, atomic ballot transaction/rollback, anonymous ballot separation, import commit/lock behavior, and exports.
- End-to-end tests on web and Expo builds: student OTP-to-vote path, failed/expired OTP, already-voted state, closed election, results publication, manager setup, observer restrictions, and super-admin account lifecycle.
- Security regression tests: unauthorized endpoint access, privilege escalation, repeated OTP/login attempts, client-tampered ballot payloads, invalid upload types, session/CSRF handling, and PII/secret redaction.

### Operational rehearsal

Run a timed mock election in staging with election staff before launch. Rehearse CSV import, candidate setup, open/close, student voting on web/Android/iOS, OTP delivery delay/failure support, result publication, export, tie handling, an early-close scenario, and incident contacts. Conduct a load test representative of the expected 5,000-student OTP and voting surge without using real student data.

## 13. Delivery sequence

1. Establish monorepo, TypeScript standards, environment isolation, CI, Next.js/Expo SDK 57 baselines, database connection, migrations, and provider accounts.
2. Implement database model, shared validation/contracts, admin authentication/roles, audit system, and super-admin account management.
3. Build web-based election setup: CSV validation/import, candidates/Cloudinary uploads, scheduling, preview, state controls, and locked-election behavior.
4. Build secure student authentication, OTP delivery, rate limits, web ballot/review/submission/receipt, and anonymous transactional persistence.
5. Build the equivalent Expo student flow; restrict mobile admin experience to final results.
6. Implement closed/published result views, aggregate exports, privacy notice, retention jobs, monitoring, and incident alerts.
7. Complete test coverage, security review, staging rehearsal, representative load test, store submission, and production election runbook.

## 14. Acceptance criteria

- An eligible student can complete the same secure flow on web, Android, and iOS and can successfully submit exactly one ballot.
- Ineligible, duplicate, or already-voted matric numbers cannot obtain a vote-capable session; invalid eligibility data directs students to official support.
- Concurrent ballot submissions for a single matric number result in exactly one committed ballot.
- No API, admin screen, audit event, export, or database query path links a voter identity to candidate selections.
- Admins cannot view results during an open election; after closing and publishing, results, turnout, winner, and tie state are accurate and available according to role.
- Open elections cannot have their candidate list, positions, or eligibility register edited.
- The full mock-election rehearsal completes successfully in staging and monitoring detects intentionally injected OTP/API/submission failures.

## 15. Remaining operational risks

- Verify free-tier quotas and rate limits for Neon, Vercel, Resend, Cloudinary, Expo/EAS, and chosen monitoring against the rehearsal/load-test results; secure approval before any limit blocks voting.
- Confirm school-email deliverability, sender-domain verification, spam handling, and the department's on-call support contact before inviting voters.
- Prepare an approved written department policy for ties, disputes, early closure, election cancellation, and communication of final results.
- Your personal Apple/Google developer accounts own the first store listings and related compliance obligations; preserve recovery access and document future ownership transfer if the department assumes control.
