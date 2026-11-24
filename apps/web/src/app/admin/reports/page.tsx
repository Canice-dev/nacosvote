import { desc, eq } from "drizzle-orm";
import { Download, FileSpreadsheet } from "lucide-react";

import { AdminSidebar } from "@/components/admin-sidebar";
import { db } from "@/db";
import { elections } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Final Reports | NACOS Vote" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const admin = await requireAdmin();
  const publishedElections = await db
    .select({
      id: elections.id,
      title: elections.title,
      departmentName: elections.departmentName,
      timezone: elections.timezone,
      startsAt: elections.startsAt,
      endsAt: elections.endsAt,
      publishedAt: elections.publishedAt,
    })
    .from(elections)
    .where(eq(elections.state, "published"))
    .orderBy(desc(elections.publishedAt), desc(elections.createdAt));

  const adminSidebar = {
    username: admin.username,
    email: admin.email,
    initials: admin.username.slice(0, 2).toUpperCase(),
  };

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar {...adminSidebar} />
      <div className="transition-[padding] duration-200 lg:pl-(--admin-sidebar-width)">
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <header className="pb-7">
            <p className="text-sm font-medium text-[#707773]">Administration</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
              Final reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">
              Download the published final report for any past election.
            </p>
          </header>

          {publishedElections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfdad5] bg-white px-6 py-14 text-center">
              <FileSpreadsheet
                className="mx-auto size-9 text-[#71817a]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-base font-semibold text-[#39413e]">
                No final reports yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c78]">
                Reports will appear here after an election is closed and its
                results are published.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white">
              <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(15rem,1fr)_auto] items-center gap-5 bg-[#f8faf8] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#737c77] sm:grid">
                <span>Election</span>
                <span>Election period</span>
                <span className="sr-only">Download</span>
              </div>
              <ul className="divide-y divide-[#edf0ed]">
                {publishedElections.map((election) => {
                  const dateFormat = new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeZone: election.timezone,
                  });
                  const timeFormat = new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: election.timezone,
                  });

                  return (
                    <li
                      key={election.id}
                      className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1.5fr)_minmax(15rem,1fr)_auto] sm:items-center sm:gap-5"
                    >
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-[#34403b]">
                          {election.title}
                        </h2>
                        <p className="mt-1 text-sm text-[#737c77]">
                          {election.departmentName}
                        </p>
                        <p className="mt-1 text-xs text-[#89918c]">
                          Published{" "}
                          {election.publishedAt
                            ? timeFormat.format(election.publishedAt)
                            : "Not available"}
                        </p>
                      </div>
                      <p className="text-sm text-[#59645e]">
                        <span className="sm:hidden">Election period: </span>
                        {dateFormat.format(election.startsAt)} to{" "}
                        {dateFormat.format(election.endsAt)}
                        <span className="mt-1 block text-xs text-[#89918c]">
                          {election.timezone}
                        </span>
                      </p>
                      <a
                        href={`/api/admin/elections/${election.id}/report`}
                        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-[#176356] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#124f45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176356] focus-visible:ring-offset-2"
                      >
                        <Download className="size-4" aria-hidden="true" />
                        Download report
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
