import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, admins } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

const roles = ["super_admin", "manager", "observer"] as const;
type AdminRole = (typeof roles)[number];

type RouteContext = { params: Promise<{ adminId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const currentAdmin = await getAdminSession();
  if (!currentAdmin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }
  if (currentAdmin.role !== "super_admin") {
    return NextResponse.json({ message: "Only super administrators can update admin roles." }, { status: 403 });
  }

  const { adminId } = await params;
  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }
  const role = body.role;
  if (typeof role !== "string" || !roles.includes(role as AdminRole)) {
    return NextResponse.json({ message: "Select a valid administrator role." }, { status: 400 });
  }

  const [target] = await db.select().from(admins).where(eq(admins.id, adminId)).limit(1);
  if (!target) {
    return NextResponse.json({ message: "Administrator account not found." }, { status: 404 });
  }

  if (target.isActive && target.role === "super_admin" && role !== "super_admin") {
    const [{ value: activeSuperAdmins }] = await db
      .select({ value: count() })
      .from(admins)
      .where(and(eq(admins.role, "super_admin"), eq(admins.isActive, true)));
    if (activeSuperAdmins <= 1) {
      return NextResponse.json({ message: "At least one active super administrator must remain." }, { status: 409 });
    }
  }

  const [updated] = await db
    .update(admins)
    .set({ role: role as AdminRole, updatedAt: new Date() })
    .where(eq(admins.id, adminId))
    .returning({ id: admins.id, role: admins.role });

  await db.insert(adminAuditEvents).values({
    actorAdminId: currentAdmin.id,
    action: "admin.role_updated",
    targetType: "admin",
    targetId: target.id,
    metadata: { username: target.username, previousRole: target.role, role: updated.role },
  });

  return NextResponse.json({ admin: updated });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const currentAdmin = await getAdminSession();
  if (!currentAdmin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }
  if (currentAdmin.role !== "super_admin") {
    return NextResponse.json({ message: "Only super administrators can delete admin accounts." }, { status: 403 });
  }

  const { adminId } = await params;
  if (adminId === currentAdmin.id) {
    return NextResponse.json({ message: "You cannot delete your own administrator account." }, { status: 400 });
  }

  const [target] = await db.select().from(admins).where(eq(admins.id, adminId)).limit(1);
  if (!target) {
    return NextResponse.json({ message: "Administrator account not found." }, { status: 404 });
  }

  if (target.isActive && target.role === "super_admin") {
    const [{ value: activeSuperAdmins }] = await db
      .select({ value: count() })
      .from(admins)
      .where(and(eq(admins.role, "super_admin"), eq(admins.isActive, true)));
    if (activeSuperAdmins <= 1) {
      return NextResponse.json({ message: "At least one active super administrator must remain." }, { status: 409 });
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(admins).set({ isActive: false, updatedAt: new Date() }).where(eq(admins.id, adminId));
    await tx.insert(adminAuditEvents).values({
      actorAdminId: currentAdmin.id,
      action: "admin.deactivated",
      targetType: "admin",
      targetId: target.id,
      metadata: { username: target.username, role: target.role },
    });
  });

  return NextResponse.json({ success: true });
}
