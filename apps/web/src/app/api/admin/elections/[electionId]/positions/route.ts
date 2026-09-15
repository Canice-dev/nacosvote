import { and, eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, elections, positions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";
import { isPositionTitle } from "@/lib/position-titles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ electionId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }

  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json({ message: "You do not have permission to add positions." }, { status: 403 });
  }

  let body: { name?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }

  if (typeof body.name !== "string" || !isPositionTitle(body.name)) {
    return NextResponse.json({ message: "Select a valid position title." }, { status: 400 });
  }

  const { electionId } = await params;
  const [election] = await db
    .select({ id: elections.id, state: elections.state })
    .from(elections)
    .where(eq(elections.id, electionId))
    .limit(1);

  if (!election) {
    return NextResponse.json({ message: "Election not found." }, { status: 404 });
  }

  if (election.state !== "draft" && election.state !== "scheduled") {
    return NextResponse.json({ message: "Positions cannot be changed after voting has opened." }, { status: 409 });
  }

  const [existingPosition] = await db
    .select({ id: positions.id })
    .from(positions)
    .where(and(eq(positions.electionId, election.id), eq(positions.name, body.name)))
    .limit(1);

  if (existingPosition) {
    return NextResponse.json({ message: "This position has already been added to the election." }, { status: 409 });
  }

  const [order] = await db
    .select({ highestDisplayOrder: max(positions.displayOrder) })
    .from(positions)
    .where(eq(positions.electionId, election.id));

  try {
    const [position] = await db
      .insert(positions)
      .values({
        electionId: election.id,
        name: body.name,
        displayOrder: (order?.highestDisplayOrder ?? 0) + 1,
      })
      .returning();

    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: "position.created",
      targetType: "position",
      targetId: position.id,
      metadata: { electionId: election.id, name: position.name },
    });

    return NextResponse.json({ position }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { message: "This position has already been added to the election." },
        { status: 409 },
      );
    }

    console.error("Unable to add election position.", error);
    return NextResponse.json({ message: "Unable to add position. Please try again." }, { status: 500 });
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
