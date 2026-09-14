import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminSessions, admins } from "@/db/schema";

const scrypt = promisify(scryptCallback);
const INVALID_CREDENTIALS_MESSAGE = "Invalid username or password.";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, encodedHash] = storedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !encodedHash) {
    return false;
  }

  const storedKey = Buffer.from(encodedHash, "base64url");
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
  return timingSafeEqual(storedKey, derivedKey);
}

export async function POST(request: Request) {
  let body: { identifier?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 400 });
  }

  if (typeof body.identifier !== "string" || typeof body.password !== "string") {
    return Response.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 400 });
  }

  const identifier = body.identifier.trim();

  if (!identifier || !body.password) {
    return Response.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 400 });
  }

  try {
    const [admin] = await db
      .select({ id: admins.id, passwordHash: admins.passwordHash })
      .from(admins)
      .where(
        and(
          eq(admins.isActive, true),
          or(eq(admins.username, identifier), eq(admins.email, identifier.toLowerCase())),
        ),
      )
      .limit(1);

    if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) {
      return Response.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await db.insert(adminSessions).values({
      adminId: admin.id,
      tokenHash,
      expiresAt,
    });

    const response = NextResponse.json({ nextPath: "/admin" });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Unable to sign in admin.", error);
    return Response.json(
      { message: "Sign-in is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
