import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { and, desc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  elections,
  otpChallenges,
  studentEligibility,
} from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_CODE_MESSAGE = "The verification code is invalid or has expired. Request a new code and try again.";
const MATRIC_NUMBER_PATTERN = /^\d{4}\/\d{6}$/;
const OTP_PATTERN = /^\d{6}$/;

function normalizeMatricNumber(value: string) {
  return value.trim().replaceAll(" ", "");
}

export async function POST(request: Request) {
  let body: { matricNumber?: unknown; code?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: INVALID_CODE_MESSAGE }, { status: 400 });
  }

  if (typeof body.matricNumber !== "string" || typeof body.code !== "string") {
    return Response.json({ message: INVALID_CODE_MESSAGE }, { status: 400 });
  }

  const matricNumber = normalizeMatricNumber(body.matricNumber);
  const code = body.code.trim();
  const otpHashSecret = process.env.OTP_HASH_SECRET;

  if (
    !MATRIC_NUMBER_PATTERN.test(matricNumber) ||
    !OTP_PATTERN.test(code) ||
    !otpHashSecret ||
    otpHashSecret.length < 32
  ) {
    return Response.json({ message: INVALID_CODE_MESSAGE }, { status: 400 });
  }

  const now = new Date();

  try {
    const [election] = await db
      .select({ id: elections.id, endsAt: elections.endsAt })
      .from(elections)
      .where(
        and(
          eq(elections.state, "open"),
          lte(elections.startsAt, now),
          gt(elections.endsAt, now),
        ),
      )
      .limit(1);

    if (!election) {
      return Response.json({ message: INVALID_CODE_MESSAGE }, { status: 401 });
    }

    const [challenge] = await db
      .select({
        id: otpChallenges.id,
        otpHash: otpChallenges.otpHash,
        failedAttempts: otpChallenges.failedAttempts,
        eligibilityId: studentEligibility.id,
      })
      .from(otpChallenges)
      .innerJoin(
        studentEligibility,
        eq(otpChallenges.eligibilityId, studentEligibility.id),
      )
      .where(
        and(
          eq(studentEligibility.electionId, election.id),
          eq(studentEligibility.matricNumber, matricNumber),
          eq(studentEligibility.status, "eligible"),
          isNull(studentEligibility.votedAt),
          isNull(otpChallenges.consumedAt),
          gt(otpChallenges.expiresAt, now),
        ),
      )
      .orderBy(desc(otpChallenges.sentAt))
      .limit(1);

    if (!challenge) {
      return Response.json({ message: INVALID_CODE_MESSAGE }, { status: 401 });
    }

    const submittedHash = createHmac("sha256", otpHashSecret)
      .update(code)
      .digest("hex");
    const isValid = timingSafeEqual(
      Buffer.from(submittedHash, "hex"),
      Buffer.from(challenge.otpHash, "hex"),
    );

    if (!isValid) {
      const failedAttempts = challenge.failedAttempts + 1;
      await db
        .update(otpChallenges)
        .set({
          failedAttempts,
          consumedAt: failedAttempts >= 5 ? now : undefined,
        })
        .where(eq(otpChallenges.id, challenge.id));

      return Response.json({ message: INVALID_CODE_MESSAGE }, { status: 401 });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Math.min(now.getTime() + 24 * 60 * 60 * 1000, election.endsAt.getTime()));

    // The Neon HTTP driver has no interactive `db.transaction()` support.
    // This single CTE is still one atomic Postgres statement: it creates a
    // session only if this exact OTP can be consumed at the same time.
    const session = await db.execute(sql`
      with consumed_challenge as (
        update otp_challenges
        set verified_at = ${now}, consumed_at = ${now}
        where id = ${challenge.id} and consumed_at is null
        returning eligibility_id
      )
      insert into voter_sessions (id, eligibility_id, token_hash, expires_at)
      select ${randomUUID()}, eligibility_id, ${tokenHash}, ${expiresAt}
      from consumed_challenge
      returning id
    `);

    if (session.rows.length === 0) {
      return Response.json({ message: INVALID_CODE_MESSAGE }, { status: 401 });
    }

    const response = NextResponse.json({ nextPath: "/student/ballot" });
    response.cookies.set("student_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Unable to verify student authentication.", error);
    return Response.json(
      {
        message: "Sign-in is temporarily unavailable. Please try again later.",
        developmentError:
          process.env.NODE_ENV === "production" || !(error instanceof Error)
            ? undefined
            : error.message,
      },
      { status: 503 },
    );
  }
}
