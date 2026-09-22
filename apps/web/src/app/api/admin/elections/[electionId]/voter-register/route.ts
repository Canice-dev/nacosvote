import { asc, count, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, elections, studentEligibility } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ electionId: string }> };

function canManageVoters(role: string) {
  return role === "manager" || role === "super_admin";
}

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }
  if (!canManageVoters(admin.role)) {
    return NextResponse.json({ message: "You do not have permission to manage voter registers." }, { status: 403 });
  }

  const { electionId } = await params;
  const [target] = await db
    .select({ id: elections.id, title: elections.title, state: elections.state })
    .from(elections)
    .where(eq(elections.id, electionId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ message: "Election not found." }, { status: 404 });
  }

  const [targetRegister] = await db
    .select({ count: count() })
    .from(studentEligibility)
    .where(eq(studentEligibility.electionId, electionId));

  const sources = await db
    .select({
      id: elections.id,
      title: elections.title,
      state: elections.state,
      voterCount: count(studentEligibility.id),
    })
    .from(elections)
    .leftJoin(studentEligibility, eq(studentEligibility.electionId, elections.id))
    .where(ne(elections.id, electionId))
    .groupBy(elections.id)
    .orderBy(asc(elections.startsAt));

  return NextResponse.json({
    election: { ...target, voterCount: targetRegister?.count ?? 0 },
    sourceElections: sources.filter((source) => source.voterCount > 0),
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }
  if (!canManageVoters(admin.role)) {
    return NextResponse.json({ message: "You do not have permission to manage voter registers." }, { status: 403 });
  }

  let body: { sourceElectionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }
  if (typeof body.sourceElectionId !== "string") {
    return NextResponse.json({ message: "Select a source election to reuse its voter register." }, { status: 400 });
  }

  const { electionId } = await params;
  if (body.sourceElectionId === electionId) {
    return NextResponse.json({ message: "Choose a different election as the source register." }, { status: 400 });
  }

  const [[target], [source], [targetRegister]] = await Promise.all([
    db.select({ id: elections.id, title: elections.title, state: elections.state })
      .from(elections).where(eq(elections.id, electionId)).limit(1),
    db.select({ id: elections.id, title: elections.title })
      .from(elections).where(eq(elections.id, body.sourceElectionId)).limit(1),
    db.select({ count: count() }).from(studentEligibility)
      .where(eq(studentEligibility.electionId, electionId)),
  ]);

  if (!target || !source) {
    return NextResponse.json({ message: "The selected election could not be found." }, { status: 404 });
  }
  if (target.state !== "draft" && target.state !== "scheduled") {
    return NextResponse.json({ message: "Voter registers can only be changed before an election opens." }, { status: 409 });
  }
  if ((targetRegister?.count ?? 0) > 0) {
    return NextResponse.json({ message: "This election already has a voter register. Review or replace it before reusing another register." }, { status: 409 });
  }

  try {
    const result = await db.execute(sql`
      with copied_voters as (
        insert into student_eligibility (
          election_id, matric_number, full_name, school_email, level, status
        )
        select
          ${target.id}, matric_number, full_name, school_email, level, 'eligible'
        from student_eligibility
        where election_id = ${source.id} and status = 'eligible'
        returning id
      ), audit_event as (
        insert into admin_audit_events (
          actor_admin_id, action, target_type, target_id, metadata
        )
        values (
          ${admin.id},
          'voter_register.reused',
          'election',
          ${target.id},
          jsonb_build_object(
            'sourceElectionId', ${source.id}::text,
            'sourceElectionTitle', ${source.title}::text,
            'copiedVoterCount', (select count(*) from copied_voters)
          )
        )
      )
      select count(*)::int as copied_count from copied_voters
    `);

    const copiedCount = Number((result.rows[0] as { copied_count?: number })?.copied_count ?? 0);
    return NextResponse.json({ copiedCount, sourceElection: { id: source.id, title: source.title } }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ message: "The source register contains duplicate voter details that cannot be copied." }, { status: 409 });
    }
    console.error("Unable to reuse voter register.", error);
    return NextResponse.json({ message: "Unable to reuse the voter register. Please try again." }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
