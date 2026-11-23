import { NextResponse } from "next/server";

import { closeExpiredElections } from "@/lib/close-expired-elections";

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
    const closedCount = await closeExpiredElections();
    return NextResponse.json({ closedCount });
  } catch (error) {
    console.error("Unable to close expired elections.", error);
    return NextResponse.json(
      { message: "Unable to close expired elections." },
      { status: 500 },
    );
  }
}
