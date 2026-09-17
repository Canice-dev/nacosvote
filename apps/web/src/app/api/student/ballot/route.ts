import { createHash, randomBytes, randomUUID } from "node:crypto";

import { and, asc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db";
import {
  candidates,
  elections,
  positions,
  studentEligibility,
  voterSessions,
} from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_MESSAGE =
  "Your voting session has expired. Please sign in again.";
const VOTING_UNAVAILABLE_MESSAGE = "Voting is not available at this time.";

function sessionToken(request: NextRequest) {
  return request.cookies.get("student_session")?.value;
}

export async function GET(request: NextRequest) {
  const token = sessionToken(request);
  if (!token)
    return Response.json({ message: SESSION_MESSAGE }, { status: 401 });

  const now = new Date();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const [session] = await db
      .select({
        electionId: elections.id,
        title: elections.title,
        endsAt: elections.endsAt,
      })
      .from(voterSessions)
      .innerJoin(
        studentEligibility,
        eq(voterSessions.eligibilityId, studentEligibility.id),
      )
      .innerJoin(elections, eq(studentEligibility.electionId, elections.id))
      .where(
        and(
          eq(voterSessions.tokenHash, tokenHash),
          isNull(voterSessions.revokedAt),
          gt(voterSessions.expiresAt, now),
          isNull(studentEligibility.votedAt),
          eq(studentEligibility.status, "eligible"),
          eq(elections.state, "open"),
          lte(elections.startsAt, now),
          gt(elections.endsAt, now),
        ),
      )
      .limit(1);

    if (!session)
      return Response.json({ message: SESSION_MESSAGE }, { status: 401 });

    const rows = await db
      .select({
        positionId: positions.id,
        positionName: positions.name,
        positionOrder: positions.displayOrder,
        candidateId: candidates.id,
        candidateName: candidates.fullName,
        manifesto: candidates.manifesto,
        imageUrl: candidates.imageUrl,
      })
      .from(positions)
      .innerJoin(candidates, eq(candidates.positionId, positions.id))
      .where(
        and(
          eq(positions.electionId, session.electionId),
          eq(candidates.isActive, true),
        ),
      )
      .orderBy(asc(positions.displayOrder), asc(candidates.displayOrder));

    const ballot = new Map<
      string,
      {
        id: string;
        name: string;
        candidates: Array<{
          id: string;
          fullName: string;
          manifesto: string;
          imageUrl: string | null;
        }>;
      }
    >();
    for (const row of rows) {
      const position = ballot.get(row.positionId) ?? {
        id: row.positionId,
        name: row.positionName,
        candidates: [],
      };
      position.candidates.push({
        id: row.candidateId,
        fullName: row.candidateName,
        manifesto: row.manifesto,
        imageUrl: row.imageUrl,
      });
      ballot.set(row.positionId, position);
    }

    return Response.json({
      election: { title: session.title, endsAt: session.endsAt },
      positions: [...ballot.values()],
    });
  } catch (error) {
    console.error("Unable to load student ballot.", error);
    return Response.json(
      { message: VOTING_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const token = sessionToken(request);
  if (!token)
    return Response.json({ message: SESSION_MESSAGE }, { status: 401 });

  let body: { selections?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Your ballot is invalid. Please review your choices." },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.selections) ||
    body.selections.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof (item as { positionId?: unknown }).positionId !== "string" ||
        typeof (item as { candidateId?: unknown }).candidateId !== "string",
    )
  ) {
    return Response.json(
      { message: "Your ballot is invalid. Please review your choices." },
      { status: 400 },
    );
  }

  const selections = body.selections as Array<{
    positionId: string;
    candidateId: string;
  }>;
  if (
    selections.length === 0 ||
    new Set(selections.map((item) => item.positionId)).size !==
      selections.length
  ) {
    return Response.json(
      { message: "Choose one candidate for every position." },
      { status: 400 },
    );
  }

  const now = new Date();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const [session] = await db
      .select({ electionId: studentEligibility.electionId })
      .from(voterSessions)
      .innerJoin(
        studentEligibility,
        eq(voterSessions.eligibilityId, studentEligibility.id),
      )
      .where(
        and(
          eq(voterSessions.tokenHash, tokenHash),
          isNull(voterSessions.revokedAt),
          gt(voterSessions.expiresAt, now),
          isNull(studentEligibility.votedAt),
        ),
      )
      .limit(1);

    if (!session)
      return Response.json({ message: SESSION_MESSAGE }, { status: 401 });

    const validChoices = await db
      .select({ positionId: positions.id, candidateId: candidates.id })
      .from(positions)
      .innerJoin(candidates, eq(candidates.positionId, positions.id))
      .where(
        and(
          eq(positions.electionId, session.electionId),
          eq(candidates.isActive, true),
        ),
      );
    const expectedPositions = new Set(
      validChoices.map((choice) => choice.positionId),
    );
    const choiceKeys = new Set(
      validChoices.map(
        (choice) => `${choice.positionId}:${choice.candidateId}`,
      ),
    );

    if (
      selections.length !== expectedPositions.size ||
      selections.some(
        (choice) =>
          !choiceKeys.has(`${choice.positionId}:${choice.candidateId}`),
      )
    ) {
      return Response.json(
        {
          message:
            "Your ballot has changed. Reload it and select one candidate for every position.",
        },
        { status: 409 },
      );
    }

    const receipt = randomBytes(18).toString("base64url");
    const receiptHash = createHash("sha256").update(receipt).digest("hex");
    const ballotId = randomUUID();
    const voteValues = sql.join(
      selections.map(
        (choice) => sql`(${choice.positionId}, ${choice.candidateId})`,
      ),
      sql`, `,
    );

    const result = await db.execute(sql`
      with valid_session as (
        select voter_sessions.eligibility_id, student_eligibility.election_id
        from voter_sessions
        join student_eligibility on student_eligibility.id = voter_sessions.eligibility_id
        join elections on elections.id = student_eligibility.election_id
        where voter_sessions.token_hash = ${tokenHash}
          and voter_sessions.revoked_at is null
          and voter_sessions.expires_at > ${now}
          and student_eligibility.status = 'eligible'
          and student_eligibility.voted_at is null
          and elections.state = 'open'
          and elections.starts_at <= ${now}
          and elections.ends_at > ${now}
      ), claimed_voter as (
        update student_eligibility
        set voted_at = ${now}
        from valid_session
        where student_eligibility.id = valid_session.eligibility_id
          and student_eligibility.voted_at is null
        returning student_eligibility.id
      ), revoked_session as (
        update voter_sessions
        set revoked_at = ${now}
        from claimed_voter
        where voter_sessions.eligibility_id = claimed_voter.id
          and voter_sessions.revoked_at is null
      ), new_ballot as (
        insert into ballots (id, election_id, receipt_token_hash, submitted_at)
        select ${ballotId}, valid_session.election_id, ${receiptHash}, ${now}
        from valid_session join claimed_voter on claimed_voter.id = valid_session.eligibility_id
        returning id, election_id
      ), recorded_votes as (
        insert into ballot_votes (ballot_id, election_id, position_id, candidate_id)
        select new_ballot.id, new_ballot.election_id, choices.position_id::uuid, choices.candidate_id::uuid
        from new_ballot
        cross join (values ${voteValues}) as choices(position_id, candidate_id)
        returning ballot_id
      )
      select id from new_ballot
    `);

    if (result.rows.length === 0)
      return Response.json(
        { message: "Your session is no longer valid. Please sign in again." },
        { status: 409 },
      );

    return Response.json({ receipt });
  } catch (error) {
    console.error("Unable to submit ballot.", error);
    return Response.json(
      {
        message:
          "We could not submit your ballot. Your vote has not been recorded. Please try again.",
      },
      { status: 503 },
    );
  }
}
