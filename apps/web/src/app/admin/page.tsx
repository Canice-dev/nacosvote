import { AdminSidebar } from "@/components/admin-sidebar";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Overview | NACOS Vote" };

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

const activities = [
  [
    "Voter register imported",
    "4,892 eligible students added",
    "18 minutes ago",
    "users",
  ],
  [
    "Candidate updated",
    "Vice President manifesto revised",
    "1 hour ago",
    "candidates",
  ],
  [
    "Election opened",
    "Voting is now available to students",
    "Today, 09:00",
    "election",
  ],
  ["Admin account created", "Observer role assigned", "Yesterday", "account"],
] as const;

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const initials = admin.username.slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar
        username={admin.username}
        email={admin.email}
        initials={initials}
      />

      <div className="lg:pl-67">
        <header className="flex h-18.25 items-center justify-between border-b border-[#e6e6e3] bg-white px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 pl-12 lg:hidden">
            <span className="grid size-8 place-items-center rounded-md bg-[#0f5a50] text-xs font-bold text-white">
              NV
            </span>
            <span className="text-sm font-semibold">NACOS Vote</span>
          </div>
          <p className="hidden text-sm text-[#717773] lg:block">
            Computer Science Department{" "}
            <span className="mx-2 text-[#c3c7c4]">/</span> Election management
          </p>
        </header>

        <div className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 pb-7 sm:flex-row sm:items-end">
            <div>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                Hello, {admin.username}
              </h1>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e7f4ed] px-3 py-1.5 text-xs font-semibold text-[#177052]">
              <span className="size-1.5 rounded-full bg-[#15925f]" /> Election
              open
            </span>
          </div>

          <section className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div className="border border-[#dde5e1] bg-[#f2faf6] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#16705c]">
                  <Icon name="clock" className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#3c625c]">
                    Election closes in
                  </p>
                  <p className="mt-1 font-mono text-3xl font-semibold tracking-[-0.06em] text-[#174d45] sm:text-4xl">
                    02:14:37
                  </p>
                  <p className="mt-2 text-xs text-[#59746e]">
                    Sunday, 14 September 2026 · 5:00 PM WAT
                  </p>
                </div>
              </div>
            </div>
            <div className="border border-[#e3e5e1] bg-white p-5 sm:p-6">
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

          <section className="mt-7 grid grid-cols-2 border border-[#e1e3df] bg-white md:grid-cols-4">
            {[
              ["Eligible students", "4,892", "Registered to vote"],
              ["Verified today", "1,248", "Completed email OTP"],
              ["Ballots cast", "2,341", "47.8% turnout"],
              ["Time remaining", "02:14", "Hours and minutes"],
            ].map(([label, value, detail], index) => (
              <div
                key={label}
                className={`p-5 sm:p-6 ${index > 0 ? "border-l border-[#e7e8e5]" : ""}`}
              >
                <p className="text-xs font-medium text-[#7b827e]">{label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#303533]">
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
                  href="#"
                  className="text-sm font-medium text-[#176356] hover:underline"
                >
                  View audit log
                </a>
              </div>
              <div className="mt-4 divide-y divide-[#e7e8e5] border-y border-[#e1e3df] bg-white">
                {activities.map(([title, detail, time, icon]) => (
                  <div key={title} className="flex gap-4 px-4 py-4 sm:px-5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f2f5f3] text-[#397166]">
                      <Icon name={icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#3c4240]">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#808783]">{detail}</p>
                    </div>
                    <time className="shrink-0 text-xs text-[#929894]">
                      {time}
                    </time>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-[#343937]">
                  Election timeline
                </h2>
                <button
                  aria-label="More election options"
                  className="text-[#6f7772]"
                >
                  <Icon name="more" className="size-5" />
                </button>
              </div>
              <div className="mt-4 border border-[#e1e3df] bg-white p-5 sm:p-6">
                <ol className="space-y-5">
                  {[
                    ["Draft", "Completed", "Apr 10, 2026"],
                    ["Scheduled", "Completed", "Apr 12, 2026"],
                    ["Open", "Current", "Today, 09:00"],
                    ["Closed", "Pending", "Scheduled for 5:00 PM"],
                    ["Published", "Pending", "After review"],
                  ].map(([stage, state, date], index) => (
                    <li key={stage} className="flex gap-4">
                      <div className="relative flex w-4 justify-center">
                        {index < 4 && (
                          <span
                            className={`absolute top-4 h-8 w-px ${index < 2 ? "bg-[#4e9c87]" : "bg-[#dde2df]"}`}
                          />
                        )}
                        <span
                          className={`mt-1 size-2.5 rounded-full ring-4 ${index < 2 ? "bg-[#389b7c] ring-[#e6f4ed]" : index === 2 ? "bg-[#176356] ring-[#dceee8]" : "bg-[#c9cfcb] ring-[#f1f2f0]"}`}
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
                <button className="mt-6 w-full border border-[#cdd9d4] px-4 py-2.5 text-sm font-medium text-[#1a6256] transition hover:bg-[#f2faf6]">
                  Manage election controls
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
