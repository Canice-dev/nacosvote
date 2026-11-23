import { randomBytes, createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/db";
import { adminPasswordResetTokens, admins } from "@/db/schema";
import { consumeAuthRateLimit, getClientAddress } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_MESSAGE =
  "If an active admin account uses that email, a password reset link will be sent.";

function resetEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "NACOS Vote <onboarding@resend.dev>");
  const configuredBaseUrl =
    process.env.APP_BASE_URL ??
    (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000");

  if (!apiKey || !fromEmail || !configuredBaseUrl) return null;
  if (process.env.NODE_ENV === "production" && /@resend\.dev(?:>|$)/i.test(fromEmail)) {
    return null;
  }

  try {
    const baseUrl = new URL(configuredBaseUrl);
    if (
      !["http:", "https:"].includes(baseUrl.protocol) ||
      baseUrl.username ||
      baseUrl.password ||
      (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:")
    ) {
      return null;
    }

    return { apiKey, fromEmail, baseUrl: baseUrl.origin };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
  }

  try {
    const ipLimit = await consumeAuthRateLimit({
      scopeType: "client_ip",
      value: getClientAddress(request),
      action: "admin_password_reset_request",
      maxAttempts: 10,
      windowSeconds: 15 * 60,
      cooldownSeconds: 15 * 60,
    });
    if (!ipLimit.allowed) {
      return Response.json(
        { message: GENERIC_MESSAGE },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
      );
    }

    const emailLimit = await consumeAuthRateLimit({
      scopeType: "admin_identifier",
      value: email,
      action: "admin_password_reset_request",
      maxAttempts: 3,
      windowSeconds: 15 * 60,
      cooldownSeconds: 15 * 60,
    });
    if (!emailLimit.allowed) {
      return Response.json(
        { message: GENERIC_MESSAGE },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } },
      );
    }

    const [admin] = await db
      .select({ id: admins.id, email: admins.email })
      .from(admins)
      .where(and(eq(admins.email, email), eq(admins.isActive, true)))
      .limit(1);

    if (!admin) return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });

    const emailConfig = resetEmailConfig();
    if (!emailConfig) {
      console.error("Admin password reset email is not configured.");
      return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    const tokenResult = await db.execute<{ id: string }>(sql`
      with invalidated_tokens as (
        update admin_password_reset_tokens
        set consumed_at = ${now}
        where admin_id = ${admin.id}
          and consumed_at is null
      ), new_token as (
        insert into admin_password_reset_tokens (admin_id, token_hash, expires_at)
        values (${admin.id}, ${tokenHash}, ${expiresAt})
        returning id
      )
      select id from new_token
    `);
    const resetTokenId = tokenResult.rows[0]?.id;
    if (!resetTokenId) throw new Error("Unable to create the reset token.");

    const resetUrl = new URL("/admin/reset-password", emailConfig.baseUrl);
    resetUrl.searchParams.set("token", token);

    const consumeToken = async () =>
      await db
        .update(adminPasswordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(adminPasswordResetTokens.id, resetTokenId));

    try {
      const resend = new Resend(emailConfig.apiKey);
      const { error } = await resend.emails.send(
        {
          from: emailConfig.fromEmail,
          to: [admin.email],
          subject: "Reset your NACOS Vote admin password",
          text: `A password reset was requested for your NACOS Vote admin account. Use this link within 30 minutes to choose a new password: ${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
          html: `<p>A password reset was requested for your NACOS Vote admin account.</p><p><a href="${resetUrl.toString()}">Choose a new password</a></p><p>This link expires in 30 minutes and can only be used once. If you did not request this, you can ignore this email.</p>`,
        },
        { idempotencyKey: `admin-password-reset/${resetTokenId}` },
      );

      if (error) {
        await consumeToken();
        console.error("Resend rejected an admin password reset email.", error.name);
      }
    } catch (error) {
      await consumeToken();
      console.error(
        "Unable to send an admin password reset email.",
        error instanceof Error ? error.name : "Unknown error",
      );
    }

    return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
  } catch (error) {
    console.error("Unable to request an admin password reset.", error);
    return Response.json({ message: GENERIC_MESSAGE }, { status: 202 });
  }
}
