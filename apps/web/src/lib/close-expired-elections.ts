import { sql } from "drizzle-orm";

import { db } from "@/db";

export async function closeExpiredElections() {
  const result = await db.execute(sql`
    with newly_closed as (
      update elections
      set state = 'closed',
          closed_at = ends_at,
          updated_by_admin_id = null,
          updated_at = now()
      where state = 'open'
        and ends_at <= now()
      returning id, title, ends_at
    ), audit_events as (
      insert into admin_audit_events (
        actor_admin_id, action, target_type, target_id, reason, metadata
      )
      select
        null,
        'election.auto_closed',
        'election',
        newly_closed.id,
        'Scheduled closing time reached.',
        jsonb_build_object(
          'title', newly_closed.title,
          'closedAt', newly_closed.ends_at
        )
      from newly_closed
      returning id
    )
    select newly_closed.id from newly_closed
  `);

  return result.rows.length;
}
