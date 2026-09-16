import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, admins } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

const scrypt = promisify(scryptCallback);
const roles = ["super_admin", "manager", "observer"] as const;
type AdminRole = (typeof roles)[number];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const currentAdmin = await getAdminSession();
  if (!currentAdmin) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (currentAdmin.role !== "super_admin") {
    return NextResponse.json({ message: "Only super administrators can create admin accounts." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role as AdminRole;
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(username)) {
    return NextResponse.json({ message: "Use a username of 3-60 letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 200) {
    return NextResponse.json({ message: "The temporary password must be 12 to 200 characters." }, { status: 400 });
  }
  if (!roles.includes(role)) return NextResponse.json({ message: "Select a valid administrator role." }, { status: 400 });

  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const passwordHash = `scrypt$${salt}$${derivedKey.toString("base64url")}`;

  try {
    const [admin] = await db.insert(admins).values({
      username,
      email,
      passwordHash,
      role,
      forcePasswordChange: true,
      isActive: true,
    }).returning({ id: admins.id, username: admins.username, email: admins.email, role: admins.role, isActive: admins.isActive, createdAt: admins.createdAt });
    await db.insert(adminAuditEvents).values({
      actorAdminId: currentAdmin.id,
      action: "admin.created",
      targetType: "admin",
      targetId: admin.id,
      metadata: { username: admin.username, role: admin.role },
    });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "An administrator with this username or email already exists." }, { status: 409 });
    }
    console.error("Unable to create admin account.", error);
    return NextResponse.json({ message: "Unable to create the admin account. Please try again." }, { status: 500 });
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
