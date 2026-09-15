import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { elections, positions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ positionId: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }

  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json({ message: "You do not have permission to upload portraits." }, { status: 403 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_CANDIDATE_FOLDER;
  const uploadPreset = process.env.CLOUDINARY_CANDIDATE_UPLOAD_PRESET;

  if (!cloudName || !apiKey || !apiSecret || !folder || !uploadPreset) {
    return NextResponse.json({ message: "Candidate portrait uploads are not configured." }, { status: 503 });
  }

  const { positionId } = await params;
  const [position] = await db
    .select({ id: positions.id, electionState: elections.state })
    .from(positions)
    .innerJoin(elections, eq(positions.electionId, elections.id))
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position) {
    return NextResponse.json({ message: "Position not found." }, { status: 404 });
  }

  if (position.electionState !== "draft" && position.electionState !== "scheduled") {
    return NextResponse.json({ message: "Portraits cannot be changed after voting has opened." }, { status: 409 });
  }

  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}&upload_preset=${uploadPreset}${apiSecret}`)
    .digest("hex");

  return NextResponse.json({ cloudName, apiKey, folder, uploadPreset, timestamp, signature });
}
