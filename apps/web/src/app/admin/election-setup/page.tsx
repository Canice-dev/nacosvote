import { desc } from "drizzle-orm";

import { ElectionManager } from "@/components/election-manager";
import { db } from "@/db";
import { elections } from "@/db/schema";
import { closeExpiredElections } from "@/lib/close-expired-elections";
import { requireAdmin } from "@/lib/admin-session";

export default async function ElectionSetupPage() {
  const admin = await requireAdmin();
  await closeExpiredElections();
  const existingElections = await db.select({
    id: elections.id,
    departmentName: elections.departmentName,
    title: elections.title,
    timezone: elections.timezone,
    startsAt: elections.startsAt,
    endsAt: elections.endsAt,
    state: elections.state,
  }).from(elections).orderBy(desc(elections.createdAt));

  return (
    <ElectionManager
      initialElections={existingElections}
      admin={{ username: admin.username, email: admin.email, initials: admin.username.slice(0, 2).toUpperCase(), role: admin.role }}
    />
  );
}
