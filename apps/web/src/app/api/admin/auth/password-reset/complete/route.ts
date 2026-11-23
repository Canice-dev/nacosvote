import { createHash, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { db } from "@/db";
import { adminPasswordResetTokens } from "@/db/schema";
import { consumeAuthRateLimit, getClientAddress } from "@/lib/auth-rate-limit";

const scrypt = promisify(scryptCallback);
const INVALID_RESET_MESSAGE =
  "This password reset link is invalid or expired. Request a new link and try again.";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: INVALID_RESET_MESSAGE }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return Response.json({ message: INVALID_RESET_MESSAGE }, { status: 400 });
  }
  if (password.length < 12 || password.length > 200) {
    return Response.json(
      { message: "Choose a password between 12 and 200 characters." },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  try {
    const ipLimit = await consumeAuthRateLimit({
      scopeType: "client_ip",
      value: getClientAddress(request),
      action: "admin_password_reset_complete",
      maxAttempts: 10,
      windowSeconds: 15 * 60,
      cooldownSeconds: 15 * 60,
    });
    if (!ipLimit.allowed) {
      return Response.json(
        { message: INVALID_RESET_MESSAGE },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
      );
    }

    const tokenLimit = await consumeAuthRateLimit({
      scopeType: "admin_reset_token",
      value: token,
      action: "admin_password_reset_complete",
      maxAttempts: 5,
      windowSeconds: 15 * 60,
      cooldownSeconds: 15 * 60,
    });
    if (!tokenLimit.allowed) {
      return Response.json(
        { message: INVALID_RESET_MESSAGE },
        { status: 429, headers: { "Retry-After": String(tokenLimit.retryAfterSeconds) } },
      );
    }

    const [validToken] = await db
      .select({ id: adminPasswordResetTokens.id })
      .from(adminPasswordResetTokens)
      .where(
        and(
          eq(adminPasswordResetTokens.tokenHash, tokenHash),
          isNull(adminPasswordResetTokens.consumedAt),
          gt(adminPasswordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!validToken) {
      return Response.json({ message: INVALID_RESET_MESSAGE }, { status: 400 });
    }

    const salt = randomBytes(16).toString("base64url");
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const passwordHash = `scrypt$${salt}$${derivedKey.toString("base64url")}`;

    const result = await db.execute<{ id: string; email: string }>(sql`
      with consumed_token as (
        update admin_password_reset_tokens
        set consumed_at = ${now}
        where id = ${validToken.id}
          and token_hash = ${tokenHash}
          and consumed_at is null
          and expires_at > ${now}
        returning admin_id
      ), updated_admin as (
        update admins
        set password_hash = ${passwordHash},
            force_password_change = false,
            updated_at = ${now}
        where id in (select admin_id from consumed_token)
          and is_active = true
        returning id, email
      ), revoked_sessions as (
        update admin_sessions
        set revoked_at = ${now}
        where admin_id in (select id from updated_admin)
          and revoked_at is null
        returning id
      ), audit_event as (
        insert into admin_audit_events (
          actor_admin_id, action, target_type, target_id, metadata
        )
        select
          null,
          'admin.password_reset',
          'admin',
          updated_admin.id,
          jsonb_build_object('method', 'email_reset_link')
        from updated_admin
        returning id
      )
      select id, email from updated_admin
    `);

    const updatedAdmin = result.rows[0];
    if (!updatedAdmin) {
      return Response.json({ message: INVALID_RESET_MESSAGE }, { status: 400 });
    }

    await sendPasswordChangedNotice(updatedAdmin.email);
    return NextResponse.json({ message: "Your password has been reset. You can sign in now." });
  } catch (error) {
    console.error("Unable to complete an admin password reset.", error);
    return Response.json(
      { message: "Unable to reset your password right now. Please try again." },
      { status: 503 },
    );
  }
}

async function sendPasswordChangedNotice(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "NACOS Vote <onboarding@resend.dev>");

  if (
    !apiKey ||
    !fromEmail ||
    (process.env.NODE_ENV === "production" && /@resend\.dev(?:>|$)/i.test(fromEmail))
  ) {
    console.error("Password reset notification email is not configured.");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Your NACOS Vote admin password was changed",
      text: "The password for your NACOS Vote admin account was just changed. If you did not make this change, contact election support immediately.",
    });
    if (error) console.error("Resend rejected the password change notice.", error.name);
  } catch (error) {
    console.error("Unable to send the password change notice.", error);
  }
}
