import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { AdminSidebar } from "@/components/admin-sidebar";
import {
  ElectionTurnoutRadial,
  OtpVerificationRadial,
} from "@/components/election-turnout-radial";
import { ResultsPositionChart } from "@/components/results-position-chart";
import { db } from "@/db";
import { closeExpiredElections } from "@/lib/close-expired-elections";
import {
  ballotVotes,
  ballots,
  candidates,
  elections,
  otpChallenges,
  positions,
  studentEligibility,
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
      <div className="lg:pl-(--admin-sidebar-width) transition-[padding] duration-200">
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          {children}
        </section>
      </div>
    </main>
  );
}

export default async function ResultsPage() {
  const signedInAdmin = await requireAdmin();
  await closeExpiredElections();
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

  const [[ballotCount], [eligibleCount], verifiedStudents] = await Promise.all([
    db
      .select({ total: count() })
      .from(ballots)
      .where(eq(ballots.electionId, election.id)),
    db
      .select({ total: count() })
      .from(studentEligibility)
      .where(
        and(
          eq(studentEligibility.electionId, election.id),
          inArray(studentEligibility.status, ["eligible", "voted"]),
        ),
      ),
    db
      .selectDistinct({ eligibilityId: otpChallenges.eligibilityId })
      .from(otpChallenges)
      .innerJoin(
        studentEligibility,
        eq(otpChallenges.eligibilityId, studentEligibility.id),
      )
      .where(
        and(
          eq(studentEligibility.electionId, election.id),
          inArray(studentEligibility.status, ["eligible", "voted"]),
          isNotNull(otpChallenges.verifiedAt),
        ),
      ),
  ]);
  const totalBallots = Number(ballotCount?.total ?? 0);
  const totalEligible = Number(eligibleCount?.total ?? 0);
  const totalOtpVerified = verifiedStudents.length;
  const rows = await db
    .select({
      positionId: positions.id,
      positionName: positions.name,
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      candidateImageUrl: candidates.imageUrl,
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
      candidates: Array<{
        id: string;
        name: string;
        imageUrl: string | null;
        votes: number;
      }>;
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
      imageUrl: row.candidateImageUrl,
      votes: Number(row.votes),
    });
    results.set(row.positionId, position);
  }

  return (
    <ResultsShell admin={admin}>
      <div className="flex flex-col justify-between gap-5 pb-7 sm:flex-row sm:items-end">
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
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <ElectionTurnoutRadial
          eligibleStudents={totalEligible}
          ballotsCast={totalBallots}
        />
        <OtpVerificationRadial
          otpVerified={totalOtpVerified}
          ballotsCast={totalBallots}
        />
      </div>
      <div className="mt-5 grid gap-5">
        {[...results.entries()].map(([positionId, position]) => (
          <ResultsPositionChart
            key={positionId}
            name={position.name}
            candidates={position.candidates}
          />
        ))}
      </div>
    </ResultsShell>
  );
}
