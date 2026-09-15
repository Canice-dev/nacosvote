import { and, eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, candidates, elections, positions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ positionId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }

  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json({ message: "You do not have permission to add candidates." }, { status: 403 });
  }

  let body: { fullName?: unknown; manifesto?: unknown; imagePublicId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const manifesto = typeof body.manifesto === "string" ? body.manifesto.trim() : "";
  const imagePublicId = typeof body.imagePublicId === "string" ? body.imagePublicId.trim() : "";

  if (!fullName || fullName.length > 120) {
    return NextResponse.json({ message: "Enter a candidate name of up to 120 characters." }, { status: 400 });
  }

  if (!manifesto || manifesto.length > 2_000) {
    return NextResponse.json({ message: "Enter a manifesto of up to 2,000 characters." }, { status: 400 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const portraitFolder = process.env.CLOUDINARY_CANDIDATE_FOLDER;
  if (imagePublicId) {
    const expectedPrefix = portraitFolder ? `${portraitFolder}/` : "";
    if (!cloudName || !expectedPrefix || !imagePublicId.startsWith(expectedPrefix) || !/^[A-Za-z0-9_./-]+$/.test(imagePublicId)) {
      return NextResponse.json({ message: "The candidate portrait is invalid." }, { status: 400 });
    }
  }

  const { positionId } = await params;
  const [position] = await db
    .select({ id: positions.id, electionId: positions.electionId, electionState: elections.state })
    .from(positions)
    .innerJoin(elections, eq(positions.electionId, elections.id))
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position) {
    return NextResponse.json({ message: "Position not found." }, { status: 404 });
  }

  if (position.electionState !== "draft" && position.electionState !== "scheduled") {
    return NextResponse.json({ message: "Candidates cannot be changed after voting has opened." }, { status: 409 });
  }

  const [existingCandidate] = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(and(eq(candidates.positionId, position.id), eq(candidates.fullName, fullName)))
    .limit(1);

  if (existingCandidate) {
    return NextResponse.json({ message: "This candidate has already been added to the position." }, { status: 409 });
  }

  const [order] = await db
    .select({ highestDisplayOrder: max(candidates.displayOrder) })
    .from(candidates)
    .where(eq(candidates.positionId, position.id));

  try {
    const [candidate] = await db
      .insert(candidates)
      .values({
        positionId: position.id,
        fullName,
        manifesto,
        imagePublicId: imagePublicId || null,
        imageUrl: imagePublicId ? `https://res.cloudinary.com/${cloudName}/image/upload/${imagePublicId}` : null,
        displayOrder: (order?.highestDisplayOrder ?? 0) + 1,
      })
      .returning();

    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: "candidate.created",
      targetType: "candidate",
      targetId: candidate.id,
      metadata: { electionId: position.electionId, positionId: position.id, fullName: candidate.fullName },
    });

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "Unable to assign a candidate order. Please try again." }, { status: 409 });
    }

    console.error("Unable to add candidate.", error);
    return NextResponse.json({ message: "Unable to add candidate. Please try again." }, { status: 500 });
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
