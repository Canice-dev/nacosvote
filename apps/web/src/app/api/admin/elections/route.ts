import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, elections } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStates = ["draft", "scheduled", "open", "closed"] as const;
type ElectionState = (typeof allowedStates)[number];

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }
  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json({ message: "You do not have permission to create elections." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }

  const values = parseElection(body);
  if ("message" in values) return NextResponse.json(values, { status: 400 });

  try {
    const [election] = await db.insert(elections).values({
      ...values,
      createdByAdminId: admin.id,
      updatedByAdminId: admin.id,
      closedAt: values.state === "closed" ? new Date() : null,
    }).returning();

    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: "election.created",
      targetType: "election",
      targetId: election.id,
      metadata: { title: election.title, state: election.state },
    });
    return NextResponse.json({ election }, { status: 201 });
  } catch (error) {
    if (isOpenElectionConflict(error)) {
      return NextResponse.json({ message: "Close the currently open election before opening another one." }, { status: 409 });
    }
    console.error("Unable to create election.", error);
    return NextResponse.json({ message: "Unable to create the election. Please try again." }, { status: 500 });
  }
}

function parseElection(body: Record<string, unknown>) {
  const departmentName = typeof body.departmentName === "string" ? body.departmentName.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
  const state = body.state as ElectionState;
  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : new Date("");
  const endsAt = typeof body.endsAt === "string" ? new Date(body.endsAt) : new Date("");

  if (!departmentName || departmentName.length > 160) return { message: "Enter a department name of up to 160 characters." };
  if (!title || title.length > 160) return { message: "Enter an election title of up to 160 characters." };
  if (!timezone || timezone.length > 100) return { message: "Enter a valid timezone." };
  if (!allowedStates.includes(state)) return { message: "Select a valid election status." };
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { message: "The closing date and time must be after the opening date and time." };
  }
  return { departmentName, title, timezone, state, startsAt, endsAt };
}

function isOpenElectionConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
