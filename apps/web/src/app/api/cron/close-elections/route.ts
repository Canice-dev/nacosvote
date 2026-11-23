import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured.");
    return NextResponse.json(
      { message: "Scheduled election closing is not configured." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
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

    return NextResponse.json({ closedCount: result.rows.length });
  } catch (error) {
    console.error("Unable to close expired elections.", error);
    return NextResponse.json(
      { message: "Unable to close expired elections." },
      { status: 500 },
    );
  }
}
