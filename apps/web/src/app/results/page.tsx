import { and, asc, count, desc, eq } from "drizzle-orm";

import { ResultsPositionChart } from "@/components/results-position-chart";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { ballotVotes, candidates, elections, positions } from "@/db/schema";

export const metadata = { title: "Election Results | NACOS Vote" };
export const dynamic = "force-dynamic";

export default async function PublishedResultsPage() {
  const [election] = await db
    .select({
      id: elections.id,
      title: elections.title,
      publishedAt: elections.publishedAt,
    })
    .from(elections)
    .where(eq(elections.state, "published"))
    .orderBy(desc(elections.publishedAt), desc(elections.createdAt))
    .limit(1);

  const rows = election
    ? await db
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
            eq(ballotVotes.electionId, election.id),
          ),
        )
        .where(eq(positions.electionId, election.id))
        .groupBy(positions.id, candidates.id)
        .orderBy(
          asc(positions.displayOrder),
          desc(count(ballotVotes.candidateId)),
          asc(candidates.fullName),
        )
    : [];

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
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <SiteHeader />
        <section className="flex-1 py-10 sm:py-14">
          <p className="text-sm font-semibold text-[#176353]">
            Published results
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#17312f] sm:text-4xl">
            {election?.title ?? "Election results"}
          </h1>

          {election ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[#66817b]">
                Final vote totals from the published election.
              </p>
              <div className="mt-8 grid gap-5">
                {[...results.entries()].map(([positionId, position]) => (
                  <ResultsPositionChart
                    key={positionId}
                    name={position.name}
                    candidates={position.candidates}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-3xl border border-[#d9e5df] bg-white p-7 sm:p-10">
              <h2 className="text-lg font-semibold text-[#17312f]">
                Results are not available yet
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#66817b]">
                Final results will appear here after the election closes and an
                election manager publishes them.
              </p>
            </div>
          )}
        </section>
        <footer className="border-t border-[#d9e5df] pt-5 text-xs text-[#66817b]">
          Results show anonymous totals only. Voter identities are not linked
          to ballot choices.
        </footer>
      </div>
    </main>
  );
}
