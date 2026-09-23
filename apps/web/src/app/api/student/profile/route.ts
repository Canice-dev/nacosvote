import { createHash } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db";
import { elections, studentEligibility, voterSessions } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_MESSAGE = "Your voting session has expired. Please sign in again.";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("student_session")?.value;
  if (!token)
    return Response.json({ message: SESSION_MESSAGE }, { status: 401 });

  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const [student] = await db
      .select({
        fullName: studentEligibility.fullName,
        matricNumber: studentEligibility.matricNumber,
        schoolEmail: studentEligibility.schoolEmail,
        level: studentEligibility.level,
        status: studentEligibility.status,
        departmentName: elections.departmentName,
        electionTitle: elections.title,
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
          gt(voterSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!student)
      return Response.json({ message: SESSION_MESSAGE }, { status: 401 });

    return Response.json({ student });
  } catch (error) {
    console.error("Unable to load student profile.", error);
    return Response.json(
      { message: "Unable to load your profile. Please try again." },
      { status: 503 },
    );
  }
}
