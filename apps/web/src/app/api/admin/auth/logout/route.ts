import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminSessions } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sessionToken = request.headers
    .get("cookie")
    ?.match(/(?:^|; )admin_session=([^;]*)/)?.[1];

  if (sessionToken) {
    const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(adminSessions.tokenHash, tokenHash));
  }

  const response = NextResponse.json({ nextPath: "/" });
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
