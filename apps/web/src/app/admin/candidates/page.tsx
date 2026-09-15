import { desc, eq, inArray } from "drizzle-orm";

import { PositionManager } from "@/components/position-manager";
import { db } from "@/db";
import { candidates, elections, positions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";

export default async function CandidatesPage() {
  const admin = await requireAdmin();
  const [election] = await db
    .select({ id: elections.id, title: elections.title, state: elections.state })
    .from(elections)
    .orderBy(desc(elections.createdAt))
    .limit(1);

  const existingPositions = election
    ? await db
        .select({ id: positions.id, name: positions.name, displayOrder: positions.displayOrder })
        .from(positions)
        .where(eq(positions.electionId, election.id))
        .orderBy(positions.displayOrder)
    : [];
  const existingCandidates = existingPositions.length
    ? await db
        .select({
          id: candidates.id,
          positionId: candidates.positionId,
          fullName: candidates.fullName,
          manifesto: candidates.manifesto,
          displayOrder: candidates.displayOrder,
          isActive: candidates.isActive,
        })
        .from(candidates)
        .where(inArray(candidates.positionId, existingPositions.map((position) => position.id)))
        .orderBy(candidates.displayOrder)
    : [];

  return (
    <PositionManager
      election={election ?? null}
      initialPositions={existingPositions}
      initialCandidates={existingCandidates}
      admin={{
        username: admin.username,
        email: admin.email,
        initials: admin.username.slice(0, 2).toUpperCase(),
      }}
    />
  );
}
