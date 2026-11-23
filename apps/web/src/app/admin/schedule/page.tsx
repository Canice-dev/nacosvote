import { ScheduleManager } from "@/components/schedule-manager";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { elections } from "@/db/schema";
import { closeExpiredElections } from "@/lib/close-expired-elections";
import { requireAdmin } from "@/lib/admin-session";

export default async function SchedulePage() {
  const admin = await requireAdmin();
  await closeExpiredElections();
  const existingElections = await db
    .select({
      id: elections.id,
      title: elections.title,
      departmentName: elections.departmentName,
      timezone: elections.timezone,
      startsAt: elections.startsAt,
      endsAt: elections.endsAt,
      state: elections.state,
    })
    .from(elections)
    .orderBy(desc(elections.startsAt));

  return (
    <ScheduleManager
      initialElections={existingElections}
      admin={{
        username: admin.username,
        email: admin.email,
        initials: admin.username.slice(0, 2).toUpperCase(),
      }}
    />
  );
}
