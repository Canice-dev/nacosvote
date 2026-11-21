import { and, count, desc, eq, gte, lt, ne, sql } from "drizzle-orm";

import { AdminSidebar } from "@/components/admin-sidebar";
import { ElectionCountdown } from "@/components/election-countdown";
import { db } from "@/db";
import {
  ballots,
  adminAuditEvents,
  admins,
  elections,
  otpChallenges,
  studentEligibility,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Overview | NACOS Vote" };

function formatRemainingTime(endsAt: Date, now: Date) {
  const remainingMinutes = Math.max(
    0,
    Math.floor((endsAt.getTime() - now.getTime()) / 60_000),
  );
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

type IconName =
  | "account"
  | "audit"
  | "bell"
  | "calendar"
  | "candidates"
  | "chevron"
  | "clock"
  | "election"
  | "home"
  | "lock"
  | "more"
  | "results"
  | "shield"
  | "users";

function getDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getUtcForLocalMidnight(
  { year, month, day }: ReturnType<typeof getDateParts>,
  timezone: string,
) {
  const localMidnight = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  let utcGuess = localMidnight;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(utcGuess));
    const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value]),
    );
    const localTimeAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
    const nextGuess = localMidnight - (localTimeAsUtc - utcGuess);
    if (nextGuess === utcGuess) break;
    utcGuess = nextGuess;
  }

  return new Date(utcGuess);
}

function getDayRange(date: Date, timezone: string) {
  try {
    const today = getDateParts(date, timezone);
    const tomorrowAnchor = new Date(
      Date.UTC(today.year, today.month - 1, today.day + 1, 12),
    );
    const tomorrow = getDateParts(tomorrowAnchor, timezone);

    return {
      start: getUtcForLocalMidnight(today, timezone),
      end: getUtcForLocalMidnight(tomorrow, timezone),
    };
  } catch {
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }
}

function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
      </>
    ),
    election: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 3v4m8-4v4M7 11h10m-7 4h4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87m-2-12a4 4 0 0 1 0 7.75" />
      </>
    ),
    candidates: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-1a7 7 0 0 1 14 0v1M16 4h6m-3-3v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    results: (
      <>
        <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
      </>
    ),
    audit: (
      <>
        <path d="M5 3h11l3 3v15H5Z" />
        <path d="M16 3v4h4M8 12h8M8 16h6" />
      </>
    ),
    account: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

type AuditActivity = {
  id: string;
  action: string;
  actorUsername: string | null;
  createdAt: Date;
};

function getActivityTitle(action: string) {
  const titles: Record<string, string> = {
    "admin.created": "Admin account created",
    "admin.deactivated": "Admin account deleted",
    "admin.role_updated": "Admin role updated",
    "candidate.created": "Candidate added",
    "election.created": "Election created",
    "election.deleted": "Election deleted",
    "election.published": "Election results published",
    "election.schedule_updated": "Election schedule updated",
    "election.status_changed": "Election status changed",
    "position.created": "Position added",
    "voter_register.imported": "Voter register imported",
  };
  return (
    titles[action] ??
    action
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function getActivityDetail(activity: AuditActivity) {
  return activity.actorUsername ? "By " + activity.actorUsername : "By an administrator";
}

function getActivityIcon(action: string): IconName {
  if (action.startsWith("admin.")) return "account";
  if (action.startsWith("candidate.") || action.startsWith("position."))
    return "candidates";
  if (action.startsWith("election.")) return "election";
  if (action.startsWith("voter_register.")) return "users";
  return "audit";
}

function formatActivityTime(date: Date, now: Date) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60_000),
  );
  const relative = new Intl.RelativeTimeFormat("en-NG", { numeric: "auto" });
  if (elapsedMinutes < 60) return relative.format(-elapsedMinutes, "minute");
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return relative.format(-elapsedHours, "hour");
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return relative.format(-elapsedDays, "day");
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function formatElectionDate(date: Date | null, timezone: string) {
  if (!date) return "Not scheduled";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(date);
  }
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const now = new Date();
  const [openElections, latestElections, recentActivities] = await Promise.all([
    db
      .select({
        id: elections.id,
        title: elections.title,
        state: elections.state,
        startsAt: elections.startsAt,
        endsAt: elections.endsAt,
        closedAt: elections.closedAt,
        publishedAt: elections.publishedAt,
        createdAt: elections.createdAt,
        updatedAt: elections.updatedAt,
        timezone: elections.timezone,
      })
      .from(elections)
      .where(eq(elections.state, "open"))
      .limit(1),
    db
      .select({
        id: elections.id,
        title: elections.title,
        state: elections.state,
        startsAt: elections.startsAt,
        endsAt: elections.endsAt,
        closedAt: elections.closedAt,
        publishedAt: elections.publishedAt,
        createdAt: elections.createdAt,
        updatedAt: elections.updatedAt,
        timezone: elections.timezone,
      })
      .from(elections)
      .orderBy(desc(elections.createdAt))
      .limit(1),
    db
      .select({
        id: adminAuditEvents.id,
        action: adminAuditEvents.action,
        actorUsername: admins.username,
        createdAt: adminAuditEvents.createdAt,
      })
      .from(adminAuditEvents)
      .leftJoin(admins, eq(adminAuditEvents.actorAdminId, admins.id))
      .orderBy(desc(adminAuditEvents.createdAt))
      .limit(4),
  ]);
  const openElection = openElections[0];
  const timelineElection = openElection ?? latestElections[0];

  let eligibleStudents = 0;
  let verifiedToday = 0;
  let ballotsCast = 0;

  if (openElection) {
    const { start: todayStart, end: tomorrowStart } = getDayRange(
      now,
      openElection.timezone,
    );
    const [eligibleResult, verifiedResult, ballotResult] = await Promise.all([
      db
        .select({ value: count() })
        .from(studentEligibility)
        .where(
          and(
            eq(studentEligibility.electionId, openElection.id),
            ne(studentEligibility.status, "disabled"),
          ),
        ),
      db
        .select({
          value: sql<number>`count(distinct ${otpChallenges.eligibilityId})::int`,
        })
        .from(otpChallenges)
        .innerJoin(
          studentEligibility,
          eq(otpChallenges.eligibilityId, studentEligibility.id),
        )
        .where(
          and(
            eq(studentEligibility.electionId, openElection.id),
            gte(otpChallenges.verifiedAt, todayStart),
            lt(otpChallenges.verifiedAt, tomorrowStart),
          ),
        ),
      db
        .select({ value: count() })
        .from(ballots)
        .where(eq(ballots.electionId, openElection.id)),
    ]);

    eligibleStudents = eligibleResult[0]?.value ?? 0;
    verifiedToday = verifiedResult[0]?.value ?? 0;
    ballotsCast = ballotResult[0]?.value ?? 0;
  }

  const turnout =
    eligibleStudents > 0
      ? ((ballotsCast / eligibleStudents) * 100).toFixed(1)
      : "0.0";
  const timeRemaining = openElection
    ? formatRemainingTime(openElection.endsAt, now)
    : "—";
  const electionStatus = !openElection
    ? "No open election"
    : now < openElection.startsAt
      ? "Election scheduled"
      : now >= openElection.endsAt
        ? "Voting window ended"
        : "Election open";

  const stateOrder = {
    draft: 0,
    scheduled: 1,
    open: 2,
    closed: 3,
    published: 4,
  } as const;
  const currentStage = timelineElection
    ? stateOrder[timelineElection.state]
    : -1;
  const electionTimeline = [
    { stage: "Draft", date: timelineElection?.createdAt ?? null },
    { stage: "Scheduled", date: timelineElection?.startsAt ?? null },
    { stage: "Open", date: timelineElection?.startsAt ?? null },
    {
      stage: "Closed",
      date: timelineElection?.closedAt ?? timelineElection?.endsAt ?? null,
    },
    {
      stage: "Published",
      date:
        timelineElection?.publishedAt ??
        (timelineElection?.state === "published"
          ? timelineElection.updatedAt
          : null) ??
        null,
    },
  ].map(({ stage, date }, index) => ({
    stage,
    date: formatElectionDate(
      date,
      timelineElection?.timezone ?? "Africa/Lagos",
    ),
    state:
      currentStage < 0
        ? "Pending"
        : index < currentStage
          ? "Completed"
          : index === currentStage
            ? "Current"
            : "Pending",
  }));

  const initials = admin.username.slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar
        username={admin.username}
        email={admin.email}
        initials={initials}
      />

      <div className="lg:pl-(--admin-sidebar-width) transition-[padding] duration-200">
        {/* <SiteHeader className="h-18.25 border-b border-[#e6e6e3] bg-white px-5 pl-17 sm:px-8 lg:px-12" /> */}

        <div className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 pb-7 sm:flex-row sm:items-end">
            <div>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                Hello, {admin.username}
              </h1>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                electionStatus === "Election open"
                  ? "bg-[#e7f4ed] text-[#177052]"
                  : "bg-[#f1f2ef] text-[#5c645f]"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  electionStatus === "Election open"
                    ? "bg-[#15925f]"
                    : "bg-[#8a908c]"
                }`}
              />
              {electionStatus}
            </span>
          </div>

          <section className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div className="bg-[#f2faf6] p-5 sm:p-6 rounded-3xl">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#16705c]">
                  <Icon name="clock" className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#3c625c]">
                    Election closes in
                  </p>
                  {openElection ? (
                    <ElectionCountdown {...openElection} />
                  ) : (
                    <>
                      <p className="mt-1 font-mono text-3xl font-semibold tracking-[-0.06em] text-[#174d45] sm:text-4xl">
                        --:--:--
                      </p>
                      <p className="mt-2 text-xs text-[#59746e]">
                        No open election
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white p-5 sm:p-6 rounded-3xl">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f6f6f4] text-[#53605b]">
                  <Icon name="lock" className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#3c4240]">
                    Results are protected
                  </p>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-[#737a76]">
                    Live vote totals remain unavailable until this election is
                    closed and explicitly published.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-7 grid grid-cols-2 bg-white md:grid-cols-4 rounded-3xl">
            {[
              {
                label: "Eligible students",
                value: eligibleStudents.toLocaleString("en-NG"),
                detail: openElection
                  ? "Registered to vote"
                  : "No open election",
              },
              {
                label: "Verified today",
                value: verifiedToday.toLocaleString("en-NG"),
                detail: openElection
                  ? "Completed email OTP"
                  : "No open election",
              },
              {
                label: "Ballots cast",
                value: ballotsCast.toLocaleString("en-NG"),
                detail: `${turnout}% turnout`,
              },
              {
                label: "Time remaining",
                value: timeRemaining,
                detail: openElection ? "Hours and minutes" : "No open election",
              },
            ].map(({ label, value, detail }, index) => (
              <div
                key={label}
                className={`p-5 sm:p-6 ${index > 0 ? "border-l border-[#e7e8e5]" : ""}`}
              >
                <p className="text-xs font-medium text-[#7b827e]">{label}</p>
                <p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.04em] text-[#303533]">
                  {value}
                </p>
                <p className="mt-2 text-xs text-[#8a908c]">{detail}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-[#343937]">
                  Recent activity
                </h2>
                <a
                  href="/admin/audit-log"
                  className="text-sm font-medium text-[#176356] hover:underline"
                >
                  View audit log
                </a>
              </div>
              <div className="mt-4 rounded-3xl divide-y divide-[#e7e8e5] bg-white">
                {recentActivities.length ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-4 px-4 py-4 sm:px-5"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f2f5f3] text-[#397166]">
                        <Icon
                          name={getActivityIcon(activity.action)}
                          className="size-4"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#3c4240]">
                          {getActivityTitle(activity.action)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#808783]">
                          {getActivityDetail(activity)}
                        </p>
                      </div>
                      <time
                        dateTime={activity.createdAt.toISOString()}
                        className="shrink-0 text-xs text-[#929894]"
                      >
                        {formatActivityTime(activity.createdAt, now)}
                      </time>
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-8 text-sm text-[#808783]">
                    No audit activity yet.
                  </p>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#343937]">
                    Election timeline
                  </h2>
                  <p className="mt-1 text-xs text-[#808783]">
                    {timelineElection?.title ?? "No election configured"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-3xl bg-white p-5 sm:p-6">
                <ol className="space-y-5">
                  {electionTimeline.map(({ stage, state, date }, index) => (
                    <li key={stage} className="flex gap-4">
                      <div className="relative flex w-4 justify-center">
                        {index < electionTimeline.length - 1 && (
                          <span
                            className={`absolute top-4 h-8 w-px ${index < currentStage ? "bg-[#4e9c87]" : "bg-[#dde2df]"}`}
                          />
                        )}
                        <span
                          className={`mt-1 size-2.5 rounded-full ring-4 ${state === "Completed" ? "bg-[#389b7c] ring-[#e6f4ed]" : state === "Current" ? "bg-[#176356] ring-[#dceee8]" : "bg-[#c9cfcb] ring-[#f1f2f0]"}`}
                        />
                      </div>
                      <div className="flex flex-1 items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-[#404643]">
                            {stage}
                          </p>
                          <p
                            className={`mt-0.5 text-xs ${state === "Current" ? "font-medium text-[#176356]" : "text-[#858c87]"}`}
                          >
                            {state}
                          </p>
                        </div>
                        <p className="text-right text-xs text-[#878e89]">
                          {date}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <a
                  href="/admin/election-setup"
                  className="mx-auto mt-6 block w-fit text-sm font-medium text-[#176356] hover:underline"
                >
                  Manage election controls
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
