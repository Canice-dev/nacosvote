import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

import { db } from "@/db";
import {
  adminAuditEvents,
  admins,
  ballotVotes,
  ballots,
  candidates,
  elections,
  positions,
  studentEligibility,
} from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

type RouteContext = { params: Promise<{ electionId: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) {
    return Response.json({ message: "Authentication is required." }, { status: 401 });
  }
  if (!["manager", "super_admin", "observer"].includes(admin.role)) {
    return Response.json({ message: "You do not have permission to export election results." }, { status: 403 });
  }

  const { electionId } = await params;
  try {
    const [election] = await db
      .select({
        id: elections.id,
        title: elections.title,
        timezone: elections.timezone,
        startsAt: elections.startsAt,
        endsAt: elections.endsAt,
        closedAt: elections.closedAt,
        publishedAt: elections.publishedAt,
        state: elections.state,
      })
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1);

    if (!election) {
      return Response.json({ message: "Election not found." }, { status: 404 });
    }
    if (election.state !== "published") {
      return Response.json(
        { message: "The final report is available after results are published." },
        { status: 409 },
      );
    }

    const [[ballotCount], [eligibleCount], voteRows] = await Promise.all([
      db.select({ total: count() }).from(ballots).where(eq(ballots.electionId, election.id)),
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
        .select({
          positionId: positions.id,
          positionName: positions.name,
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
            eq(ballotVotes.electionId, election.id),
          ),
        )
        .where(eq(positions.electionId, election.id))
        .groupBy(positions.id, candidates.id)
        .orderBy(asc(positions.displayOrder), desc(count(ballotVotes.candidateId)), asc(candidates.fullName)),
    ]);

    const totalBallots = Number(ballotCount?.total ?? 0);
    const totalEligible = Number(eligibleCount?.total ?? 0);
    const byPosition = new Map<string, { name: string; candidates: Array<{ name: string; votes: number }> }>();
    for (const row of voteRows) {
      const position = byPosition.get(row.positionId) ?? { name: row.positionName, candidates: [] };
      position.candidates.push({ name: row.candidateName, votes: Number(row.votes) });
      byPosition.set(row.positionId, position);
    }

    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: "election.report_exported",
      targetType: "election",
      targetId: election.id,
      metadata: { format: "xlsx" },
    });

    const auditRows = await db
      .select({
        action: adminAuditEvents.action,
        actor: admins.username,
        createdAt: adminAuditEvents.createdAt,
      })
      .from(adminAuditEvents)
      .leftJoin(admins, eq(adminAuditEvents.actorAdminId, admins.id))
      .where(
        or(
          and(eq(adminAuditEvents.targetType, "election"), eq(adminAuditEvents.targetId, election.id)),
          sql`${adminAuditEvents.metadata}->>'electionId' = ${election.id}`,
        ),
      )
      .orderBy(asc(adminAuditEvents.createdAt));

    const dateLabel = (date: Date | null) =>
      date
        ? new Intl.DateTimeFormat("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: election.timezone,
          }).format(date)
        : "Not recorded";

    const overview = [
      ["NACOS Vote — Final Election Report"],
      ["Election", election.title],
      ["Election timezone", election.timezone],
      ["Election starts", dateLabel(election.startsAt)],
      ["Election ends", dateLabel(election.endsAt)],
      ["Closed", dateLabel(election.closedAt)],
      ["Published", dateLabel(election.publishedAt)],
      [],
      ["Eligible voters", totalEligible],
      ["Ballots cast", totalBallots],
      ["Turnout", totalEligible > 0 ? totalBallots / totalEligible : 0],
      [],
      ["This report contains aggregate results only. Voter identities are not linked to ballot choices."],
    ];
    const results: Array<Array<string | number>> = [["Position", "Candidate", "Votes", "Outcome"]];
    for (const position of byPosition.values()) {
      const highestVoteCount = Math.max(...position.candidates.map((candidate) => candidate.votes));
      const winners = position.candidates.filter((candidate) => candidate.votes === highestVoteCount);
      for (const candidate of position.candidates) {
        const outcome =
          winners.length > 1 && candidate.votes === highestVoteCount
            ? "Tied"
            : candidate.votes === highestVoteCount
              ? "Winner"
              : "";
        results.push([position.name, candidate.name, candidate.votes, outcome]);
      }
      if (position.candidates.length === 0) results.push([position.name, "No candidates", 0, "No result"]);
      if (winners.length > 1) {
        results.push([position.name, `Tie: ${winners.map((candidate) => candidate.name).join(", ")}`, highestVoteCount, "Offline decision required"]);
      }
    }
    const audit = [
      ["Event", "Performed by", "Date and time"],
      ...auditRows.map((event) => [event.action, event.actor ?? "System", dateLabel(event.createdAt)]),
    ];

    const workbook = XLSX.utils.book_new();
    const overviewSheet = XLSX.utils.aoa_to_sheet(overview);
    overviewSheet["B11"].z = "0.0%";
    overviewSheet["!cols"] = [{ wch: 24 }, { wch: 72 }];
    const resultsSheet = XLSX.utils.aoa_to_sheet(results);
    resultsSheet["!cols"] = [{ wch: 28 }, { wch: 36 }, { wch: 12 }, { wch: 30 }];
    const auditSheet = XLSX.utils.aoa_to_sheet(audit);
    auditSheet["!cols"] = [{ wch: 34 }, { wch: 24 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");
    XLSX.utils.book_append_sheet(workbook, resultsSheet, "Position results");
    XLSX.utils.book_append_sheet(workbook, auditSheet, "Audit summary");

    const file = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const safeTitle = election.title
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "election";

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeTitle}-final-report.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Unable to generate final election report.", error);
    return Response.json(
      { message: "Unable to generate the final election report. Please try again." },
      { status: 500 },
    );
  }
}
