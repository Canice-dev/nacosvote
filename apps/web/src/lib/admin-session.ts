import { createHash } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { admins, adminSessions } from "@/db/schema";

export async function requireAdmin() {
  const sessionToken = (await cookies()).get("admin_session")?.value;

  if (!sessionToken) {
    redirect("/admin/login");
  }

  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const [admin] = await db
    .select({ username: admins.username, email: admins.email })
    .from(adminSessions)
    .innerJoin(admins, eq(adminSessions.adminId, admins.id))
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        gt(adminSessions.expiresAt, new Date()),
        isNull(adminSessions.revokedAt),
        eq(admins.isActive, true),
      ),
    )
    .limit(1);

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}
