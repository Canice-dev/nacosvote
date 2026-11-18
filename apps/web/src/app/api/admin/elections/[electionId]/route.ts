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

  let body: {
    state?: unknown;
    startsAt?: unknown;
    endsAt?: unknown;
    timezone?: unknown;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }
  const hasState = body.state !== undefined;
  const hasSchedule =
    body.startsAt !== undefined ||
    body.endsAt !== undefined ||
    body.timezone !== undefined;
  if (!hasState && !hasSchedule) {
    return NextResponse.json({ message: "Provide an election status or schedule to update." }, { status: 400 });
  }
  if (hasState && !allowedStates.includes(body.state as ElectionState)) {
    return NextResponse.json({ message: "Select a valid election status." }, { status: 400 });
  }

  let schedule: { startsAt: Date; endsAt: Date; timezone: string } | undefined;
  if (hasSchedule) {
    if (
      typeof body.startsAt !== "string" ||
      typeof body.endsAt !== "string" ||
      typeof body.timezone !== "string"
    ) {
      return NextResponse.json({ message: "Provide the opening time, closing time, and timezone." }, { status: 400 });
    }
    const timezone = body.timezone.trim();
    if (!timezone || timezone.length > 100) {
      return NextResponse.json({ message: "Enter a valid timezone." }, { status: 400 });
    }
    const startsAt = parseDateTimeInTimezone(body.startsAt, timezone);
    const endsAt = parseDateTimeInTimezone(body.endsAt, timezone);
    if (!startsAt || !endsAt || endsAt <= startsAt) {
      return NextResponse.json({ message: "The closing time must be after the opening time, using a valid time and timezone." }, { status: 400 });
    }
    schedule = { startsAt, endsAt, timezone };
  }

  const { electionId } = await params;
  const [existing] = await db.select({ id: elections.id, title: elections.title, state: elections.state })
    .from(elections).where(eq(elections.id, electionId)).limit(1);
  if (!existing) return NextResponse.json({ message: "Election not found." }, { status: 404 });
  if (existing.state === "published") {
    return NextResponse.json({ message: "A published election cannot be changed." }, { status: 409 });
  }

  const state = hasState ? (body.state as ElectionState) : undefined;
  try {
    const [election] = await db.update(elections).set({
      ...schedule,
      ...(state ? { state, closedAt: state === "closed" ? new Date() : null } : {}),
      updatedByAdminId: admin.id,
      updatedAt: new Date(),
    }).where(eq(elections.id, electionId)).returning();
    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: state ? "election.status_changed" : "election.schedule_updated",
      targetType: "election",
      targetId: election.id,
      metadata: state
        ? { title: election.title, from: existing.state, to: state }
        : { title: election.title, startsAt: election.startsAt, endsAt: election.endsAt, timezone: election.timezone },
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

function parseDateTimeInTimezone(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  const targetDate = new Date(targetUtc);
  if (
    targetDate.getUTCFullYear() !== year ||
    targetDate.getUTCMonth() !== month - 1 ||
    targetDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) return null;

  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    let utcGuess = targetUtc;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(utcGuess)).map(({ type, value }) => [type, value]),
      );
      const localAsUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
      );
      const nextGuess = utcGuess + targetUtc - localAsUtc;
      if (nextGuess === utcGuess) break;
      utcGuess = nextGuess;
    }
    const resolved = new Date(utcGuess);
    const result = Object.fromEntries(
      formatter.formatToParts(resolved).map(({ type, value }) => [type, value]),
    );
    if (
      Number(result.year) !== year || Number(result.month) !== month ||
      Number(result.day) !== day || Number(result.hour) !== hour ||
      Number(result.minute) !== minute
    ) return null;
    return resolved;
  } catch {
    return null;
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
