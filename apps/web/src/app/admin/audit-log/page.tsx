import { desc, eq } from "drizzle-orm";

import { AuditLogManager } from "@/components/audit-log-manager";
import { db } from "@/db";
import { adminAuditEvents, admins } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";

export default async function AuditLogPage() {
  const admin = await requireAdmin();
  const rows = await db
    .select({
      id: adminAuditEvents.id,
      actorAdminId: adminAuditEvents.actorAdminId,
      actorUsername: admins.username,
      actorEmail: admins.email,
      action: adminAuditEvents.action,
      targetType: adminAuditEvents.targetType,
      targetId: adminAuditEvents.targetId,
      reason: adminAuditEvents.reason,
      metadata: adminAuditEvents.metadata,
      createdAt: adminAuditEvents.createdAt,
    })
    .from(adminAuditEvents)
    .leftJoin(admins, eq(adminAuditEvents.actorAdminId, admins.id))
    .orderBy(desc(adminAuditEvents.createdAt))
    .limit(100);

  const events = rows.map((event) => ({
    ...event,
    createdAt: event.createdAt.toISOString(),
    dateLabel: new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(event.createdAt),
  }));

  return (
    <AuditLogManager
      initialEvents={events}
      admin={{
        username: admin.username,
        email: admin.email,
        initials: admin.username.slice(0, 2).toUpperCase(),
      }}
    />
  );
}
