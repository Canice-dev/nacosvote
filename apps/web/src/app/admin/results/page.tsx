import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { AdminSidebar } from "@/components/admin-sidebar";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import {
  ballotVotes,
  ballots,
  candidates,
  elections,
  positions,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Election Results | NACOS Vote" };
export const dynamic = "force-dynamic";

type Admin = { username: string; email: string; initials: string };

function ResultsShell({
  admin,
  children,
}: {
  admin: Admin;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar {...admin} />
      <div className="lg:pl-67">
        <SiteHeader className="h-18.25 border-b border-[#e6e6e3] bg-white px-5 pl-17 sm:px-8 lg:px-12" />
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          {children}
        </section>
      </div>
    </main>
  );
}

export default async function ResultsPage() {
  const signedInAdmin = await requireAdmin();
  const admin = {
    ...signedInAdmin,
    initials: signedInAdmin.username.slice(0, 2).toUpperCase(),
  };
  const [election] = await db
    .select({
      id: elections.id,
      title: elections.title,
      state: elections.state,
      closedAt: elections.closedAt,
    })
    .from(elections)
    .where(inArray(elections.state, ["closed", "published"]))
    .orderBy(desc(elections.closedAt), desc(elections.createdAt))
    .limit(1);

  if (!election)
    return (
      <ResultsShell admin={admin}>
        <div className="py-20 text-center">
          <p className="text-base font-semibold text-[#39413e]">
            Results are locked until an election is closed.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c78]">
            Close the election from Election setup after voting has concluded.
            Results will then appear here.
          </p>
        </div>
      </ResultsShell>
    );

  const [ballotCount] = await db
    .select({ total: count() })
    .from(ballots)
    .where(eq(ballots.electionId, election.id));
  const totalBallots = Number(ballotCount?.total ?? 0);
  const rows = await db
    .select({
      positionId: positions.id,
      positionName: positions.name,
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      votes: count(ballotVotes.candidateId),
    })
    .from(positions)
    .innerJoin(candidates, eq(candidates.positionId, positions.id))
    .leftJoin(
      ballotVotes,
      and(
        eq(ballotVotes.positionId, positions.id),
        eq(ballotVotes.candidateId, candidates.id),
      ),
    )
    .where(eq(positions.electionId, election.id))
    .groupBy(positions.id, candidates.id)
    .orderBy(
      asc(positions.displayOrder),
      desc(count(ballotVotes.candidateId)),
      asc(candidates.fullName),
    );
  const results = new Map<
    string,
    {
      name: string;
      candidates: Array<{ id: string; name: string; votes: number }>;
    }
  >();
  for (const row of rows) {
    const position = results.get(row.positionId) ?? {
      name: row.positionName,
      candidates: [],
    };
    position.candidates.push({
      id: row.candidateId,
      name: row.candidateName,
      votes: Number(row.votes),
    });
    results.set(row.positionId, position);
  }

  return (
    <ResultsShell admin={admin}>
      <div className="flex flex-col justify-between gap-5 border-b border-[#e5e6e2] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[#707773]">Results</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
            {election.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#727975]">
            Final results from submitted anonymous ballots.
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#e7f4ed] px-3 py-1.5 text-xs font-semibold text-[#177052]">
          {election.state === "published" ? "Published" : "Election closed"}
        </span>
      </div>
      <div className="mt-7 grid gap-5">
        <div className="bg-[#f2faf6] p-6">
          <p className="text-sm font-medium text-[#58716b]">
            Total ballots submitted
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[#174e46]">
            {totalBallots}
          </p>
        </div>
        {[...results.values()].map((position) => (
          <section key={position.name} className="bg-white p-6">
            <h2 className="text-xl font-semibold text-[#292d2b]">
              {position.name}
            </h2>
            <div className="mt-5 space-y-4">
              {position.candidates.map((candidate, index) => {
                const percentage =
                  totalBallots > 0
                    ? Math.round((candidate.votes / totalBallots) * 100)
                    : 0;
                return (
                  <div key={candidate.id}>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="font-medium text-[#39413e]">
                        {index === 0 && candidate.votes > 0 ? "Leading — " : ""}
                        {candidate.name}
                      </span>
                      <span className="font-semibold text-[#174e46]">
                        {candidate.votes} vote{candidate.votes === 1 ? "" : "s"}{" "}
                        · {percentage}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7ece9]">
                      <div
                        className="h-full rounded-full bg-[#16806b]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </ResultsShell>
  );
}
