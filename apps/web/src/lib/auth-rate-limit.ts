import { createHmac } from "node:crypto";

import { sql } from "drizzle-orm";

import { db } from "@/db";

type RateLimitOptions = {
  scopeType:
    | "student_matric"
    | "admin_identifier"
    | "admin_reset_token"
    | "client_ip";
  value: string;
  action:
    | "student_otp_start"
    | "student_otp_verify"
    | "admin_login"
    | "admin_password_reset_request"
    | "admin_password_reset_complete";
  maxAttempts: number;
  windowSeconds: number;
  cooldownSeconds: number;
};

type RateLimitRow = {
  cooldown_until: Date | string | null;
};

export function getClientAddress(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";

  // Proxies append the connecting address to this header.
  return forwardedFor.split(",").at(-1)?.trim() || "unknown";
}

function hashRateLimitKey(scopeType: string, value: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET must be configured to enforce auth limits.");
  }

  return createHmac("sha256", secret)
    .update(`${scopeType}\0${value}`)
    .digest("hex");
}

/** Atomically counts attempts in Neon and starts a cooldown after the limit. */
export async function consumeAuthRateLimit(options: RateLimitOptions) {
  const scopeKey = hashRateLimitKey(options.scopeType, options.value);
  const result = await db.execute<RateLimitRow>(sql`
    insert into auth_rate_limits (
      scope_type, scope_key, action, attempt_count,
      window_started_at, cooldown_until, updated_at
    ) values (
      ${options.scopeType}, ${scopeKey}, ${options.action}, 1,
      now(), null, now()
    )
    on conflict (scope_type, scope_key, action)
    do update set
      attempt_count = case
        when auth_rate_limits.cooldown_until > now()
          then auth_rate_limits.attempt_count
        when auth_rate_limits.window_started_at <= now() - make_interval(secs => ${options.windowSeconds})
          then 1
        else auth_rate_limits.attempt_count + 1
      end,
      window_started_at = case
        when auth_rate_limits.cooldown_until > now()
          then auth_rate_limits.window_started_at
        when auth_rate_limits.window_started_at <= now() - make_interval(secs => ${options.windowSeconds})
          then now()
        else auth_rate_limits.window_started_at
      end,
      cooldown_until = case
        when auth_rate_limits.cooldown_until > now()
          then auth_rate_limits.cooldown_until
        when auth_rate_limits.window_started_at <= now() - make_interval(secs => ${options.windowSeconds})
          then null
        when auth_rate_limits.attempt_count + 1 > ${options.maxAttempts}
          then now() + make_interval(secs => ${options.cooldownSeconds})
        else null
      end,
      updated_at = now()
    returning cooldown_until
  `);

  const cooldownUntil = result.rows[0]?.cooldown_until;
  if (!cooldownUntil) return { allowed: true, retryAfterSeconds: 0 };

  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / 1000),
  );

  return {
    allowed: retryAfterSeconds === 0,
    retryAfterSeconds,
  };
}
