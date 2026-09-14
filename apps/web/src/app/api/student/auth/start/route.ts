import { createHmac, randomInt } from "node:crypto";

import { and, eq, gt, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { elections, otpChallenges, studentEligibility } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_MESSAGE =
  "If your details are eligible, a verification code has been sent to your registered school email.";
const MATRIC_NUMBER_PATTERN = /^\d{4}\/\d{6}$/;

function normalizeMatricNumber(value: string) {
  return value.trim().replaceAll(" ", "");
}

export async function POST(request: Request) {
  let body: { matricNumber?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Enter a valid matric number." },
      { status: 400 },
    );
  }

  if (typeof body.matricNumber !== "string") {
    return Response.json(
      { message: "Enter a valid matric number." },
      { status: 400 },
    );
  }

  const matricNumber = normalizeMatricNumber(body.matricNumber);

  if (!MATRIC_NUMBER_PATTERN.test(matricNumber)) {
    return Response.json(
      { message: "Use the format YYYY/######, for example 2023/243674." },
      { status: 400 },
    );
  }

  const otpHashSecret = process.env.OTP_HASH_SECRET;

  if (!otpHashSecret || otpHashSecret.length < 32) {
    console.error("OTP_HASH_SECRET is missing or too short.");
    return Response.json(
      { message: "Sign-in is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const now = new Date();

  try {
    const [election] = await db
      .select({ id: elections.id })
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
      return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
    }

    const [eligibility] = await db
      .select({ id: studentEligibility.id })
      .from(studentEligibility)
      .where(
        and(
          eq(studentEligibility.electionId, election.id),
          eq(studentEligibility.matricNumber, matricNumber),
          eq(studentEligibility.status, "eligible"),
          isNull(studentEligibility.votedAt),
        ),
      )
      .limit(1);

    // This product intentionally gives a clear eligibility message instead of
    // concealing voter-register membership. Keep this generic if privacy
    // requirements later require resistance to eligibility enumeration.
    if (!eligibility) {
      return Response.json(
        {
          message:
            "This matric number is not eligible to vote in the Computer Science election. Please contact election support if you believe this is an error.",
        },
        { status: 403 },
      );
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const codeHash = createHmac("sha256", otpHashSecret)
      .update(code)
      .digest("hex");
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    await db
      .update(otpChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(otpChallenges.eligibilityId, eligibility.id),
          isNull(otpChallenges.consumedAt),
        ),
      );

    await db.insert(otpChallenges).values({
      eligibilityId: eligibility.id,
      otpHash: codeHash,
      expiresAt,
    });

    return Response.json(
      {
        message: GENERIC_MESSAGE,
        // Never expose this outside local development. It lets the current UI
        // be tested before an email provider is configured.
        developmentCode:
          process.env.NODE_ENV === "production" ? undefined : code,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Unable to start student authentication.", error);
    return Response.json(
      { message: "Sign-in is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
