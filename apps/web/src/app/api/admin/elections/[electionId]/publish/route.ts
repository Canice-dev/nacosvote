import * as Sentry from "@sentry/nextjs";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, elections } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

type RouteContext = { params: Promise<{ electionId: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { message: "Authentication is required." },
      { status: 401 },
    );
  }
  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json(
      { message: "You do not have permission to publish election results." },
      { status: 403 },
    );
  }

  const { electionId } = await params;
  try {
    const result = await db.execute(sql`
      with published as (
        update elections
        set state = 'published',
            published_at = now(),
            updated_by_admin_id = ${admin.id},
            updated_at = now()
        where id = ${electionId}
          and state = 'closed'
        returning id, title
      ), audit_event as (
        insert into admin_audit_events (
          actor_admin_id, action, target_type, target_id, metadata
        )
        select
          ${admin.id},
          'election.published',
          'election',
          published.id,
          jsonb_build_object('title', published.title)
        from published
        returning id
      )
      select published.id from published
    `);
    const publishedId = (result.rows[0] as { id?: string } | undefined)?.id;

    if (!publishedId) {
      const [existing] = await db
        .select({ state: elections.state })
        .from(elections)
        .where(eq(elections.id, electionId))
        .limit(1);
      if (!existing) {
        return NextResponse.json(
          { message: "Election not found." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          message:
            existing.state === "published"
              ? "This election has already been published."
              : "Only a closed election can be published.",
        },
        { status: 409 },
      );
    }

    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, publishedId))
      .limit(1);
    return NextResponse.json({ election });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "admin-elections", operation: "publish-results" },
    });
    console.error("Unable to publish election results.", error);
    return NextResponse.json(
      { message: "Unable to publish election results. Please try again." },
      { status: 500 },
    );
  }
}
