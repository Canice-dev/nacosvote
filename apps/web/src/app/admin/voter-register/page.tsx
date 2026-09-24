import { asc } from "drizzle-orm";

import { VoterRegisterManager } from "@/components/voter-register-manager";
import { db } from "@/db";
import { elections } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";

export default async function VoterRegisterPage() {
  const [admin, availableElections] = await Promise.all([
    requireAdmin(),
    db
      .select({
        id: elections.id,
        title: elections.title,
        state: elections.state,
      })
      .from(elections)
      .orderBy(asc(elections.startsAt)),
  ]);
  return <VoterRegisterManager admin={admin} elections={availableElections} />;
}
