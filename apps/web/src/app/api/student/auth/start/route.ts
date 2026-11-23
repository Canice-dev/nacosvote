import { createHmac, randomInt } from "node:crypto";

import { and, eq, gt, isNull, lte, ne } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/db";
import { elections, otpChallenges, studentEligibility } from "@/db/schema";
import { consumeAuthRateLimit, getClientAddress } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MATRIC_NUMBER_PATTERN = /^\d{4}\/\d{6}$/;

function normalizeMatricNumber(value: string) {
  return value.trim().replaceAll(" ", "");
}

function maskEmail(email: string) {
  const [localPart, domain] = email.trim().split("@");

  if (!localPart || !domain) return "your registered school email";

  const visibleEnd = localPart.length > 2 ? localPart.slice(-1) : "";
  const maskedLocal = `${localPart[0]}${"*".repeat(
    Math.max(3, localPart.length - 1 - visibleEnd.length),
  )}${visibleEnd}`;

  return `${maskedLocal}@${domain}`;
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
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail =
    process.env.RESEND_FROM_EMAIL ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "NACOS Vote <onboarding@resend.dev>");
  const usesResendTestSender = /@resend\.dev(?:>|$)/i.test(
    resendFromEmail ?? "",
  );

  if (
    !otpHashSecret ||
    otpHashSecret.length < 32 ||
    !resendApiKey ||
    !resendFromEmail ||
    (process.env.NODE_ENV === "production" && usesResendTestSender)
  ) {
    console.error("Student sign-in email is not configured.");
    return Response.json(
      { message: "Sign-in is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const now = new Date();

  try {
    const ipLimit = await consumeAuthRateLimit({
      scopeType: "client_ip",
      value: getClientAddress(request),
      action: "student_otp_start",
      maxAttempts: 20,
      windowSeconds: 15 * 60,
      cooldownSeconds: 15 * 60,
    });
    if (!ipLimit.allowed) {
      return Response.json(
        { message: "Too many sign-in requests. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
      );
    }

    const matricLimit = await consumeAuthRateLimit({
      scopeType: "student_matric",
      value: matricNumber,
      action: "student_otp_start",
      maxAttempts: 3,
      windowSeconds: 15 * 60,
      cooldownSeconds: 15 * 60,
    });
    if (!matricLimit.allowed) {
      return Response.json(
        { message: "Too many sign-in requests. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(matricLimit.retryAfterSeconds) } },
      );
    }

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
      return Response.json(
        { message: "There is no election currently open for voting." },
        { status: 409 },
      );
    }

    const [eligibility] = await db
      .select({
        id: studentEligibility.id,
        fullName: studentEligibility.fullName,
        schoolEmail: studentEligibility.schoolEmail,
      })
      .from(studentEligibility)
      .where(
        and(
          eq(studentEligibility.electionId, election.id),
          eq(studentEligibility.matricNumber, matricNumber),
          eq(studentEligibility.status, "eligible"),
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

    const [challenge] = await db
      .insert(otpChallenges)
      .values({
        eligibilityId: eligibility.id,
        otpHash: codeHash,
        expiresAt,
      })
      .returning({ id: otpChallenges.id });

    const resend = new Resend(resendApiKey);
    try {
      const { error } = await resend.emails.send(
        {
          from: resendFromEmail,
          to: [eligibility.schoolEmail],
          subject: "Your NACOS Vote verification code",
          text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
        },
        { idempotencyKey: `student-otp/${challenge.id}` },
      );

      if (error) {
        await db
          .update(otpChallenges)
          .set({ consumedAt: new Date() })
          .where(eq(otpChallenges.id, challenge.id));
        console.error("Resend rejected the student OTP email.", error.name);
        return Response.json(
          { message: "We could not send your verification code. Please try again." },
          { status: 503 },
        );
      }
    } catch (error) {
      await db
        .update(otpChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(otpChallenges.id, challenge.id));
      console.error(
        "Unable to send the student OTP email.",
        error instanceof Error ? error.name : "Unknown error",
      );
      return Response.json(
        { message: "We could not send your verification code. Please try again." },
        { status: 503 },
      );
    }

    await db
      .update(otpChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(otpChallenges.eligibilityId, eligibility.id),
          isNull(otpChallenges.consumedAt),
          ne(otpChallenges.id, challenge.id),
        ),
      );

    return Response.json(
      {
        message: `We sent a verification code for ${eligibility.fullName} to ${maskEmail(eligibility.schoolEmail)}.`,
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
