import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, elections } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

const allowedStates = ["draft", "scheduled", "open", "closed"] as const;
type ElectionState = (typeof allowedStates)[number];
type RouteContext = { params: Promise<{ electionId: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json({ message: "You do not have permission to change election status." }, { status: 403 });
  }

  let body: { state?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }
  if (!allowedStates.includes(body.state as ElectionState)) {
    return NextResponse.json({ message: "Select a valid election status." }, { status: 400 });
  }

  const { electionId } = await params;
  const [existing] = await db.select({ id: elections.id, title: elections.title, state: elections.state })
    .from(elections).where(eq(elections.id, electionId)).limit(1);
  if (!existing) return NextResponse.json({ message: "Election not found." }, { status: 404 });
  if (existing.state === "published") {
    return NextResponse.json({ message: "A published election cannot be moved back into the voting lifecycle." }, { status: 409 });
  }

  const state = body.state as ElectionState;
  try {
    const [election] = await db.update(elections).set({
      state,
      updatedByAdminId: admin.id,
      updatedAt: new Date(),
      closedAt: state === "closed" ? new Date() : null,
    }).where(eq(elections.id, electionId)).returning();
    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: "election.status_changed",
      targetType: "election",
      targetId: election.id,
      metadata: { title: election.title, from: existing.state, to: state },
    });
    return NextResponse.json({ election });
  } catch (error) {
    if (isOpenElectionConflict(error)) {
      return NextResponse.json({ message: "Close the currently open election before opening another one." }, { status: 409 });
    }
    console.error("Unable to update election status.", error);
    return NextResponse.json({ message: "Unable to update the election status. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json({ message: "You do not have permission to delete elections." }, { status: 403 });
  }

  const { electionId } = await params;
  const [existing] = await db.select({ id: elections.id, title: elections.title })
    .from(elections).where(eq(elections.id, electionId)).limit(1);
  if (!existing) return NextResponse.json({ message: "Election not found." }, { status: 404 });

  try {
    await db.delete(elections).where(eq(elections.id, electionId));
    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: "election.deleted",
      targetType: "election",
      targetId: existing.id,
      metadata: { title: existing.title },
    });
    return NextResponse.json({ deletedId: electionId });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return NextResponse.json(
        { message: "This election has associated positions, voters, or ballots and cannot be deleted." },
        { status: 409 },
      );
    }
    console.error("Unable to delete election.", error);
    return NextResponse.json({ message: "Unable to delete the election. Please try again." }, { status: 500 });
  }
}

function isOpenElectionConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function isForeignKeyConstraintError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const databaseError = error as { code?: unknown; cause?: unknown };
  // PostgreSQL uses 23503 for a foreign-key violation. Neon reports an
  // ON DELETE RESTRICT violation as 23001 instead.
  if (databaseError.code === "23503" || databaseError.code === "23001") {
    return true;
  }

  return isForeignKeyConstraintError(databaseError.cause);
}
