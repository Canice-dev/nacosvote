import { createHash } from "node:crypto";

import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminAuditEvents, elections, studentEligibility, voterImports } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_HEADERS = ["matric_number", "full_name", "school_email", "level"];
const MATRIC_PATTERN = /^\d{4}\/\d{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5_000;

type RouteContext = { params: Promise<{ electionId: string }> };
type StudentRow = { matricNumber: string; fullName: string; schoolEmail: string; level: string };

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (admin.role !== "manager" && admin.role !== "super_admin") {
    return NextResponse.json({ message: "You do not have permission to import voters." }, { status: 403 });
  }

  const { electionId } = await params;
  const [election, register] = await Promise.all([
    db.select({ id: elections.id, state: elections.state }).from(elections).where(eq(elections.id, electionId)).limit(1),
    db.select({ count: count() }).from(studentEligibility).where(eq(studentEligibility.electionId, electionId)),
  ]);
  const target = election[0];
  if (!target) return NextResponse.json({ message: "Election not found." }, { status: 404 });
  if (target.state !== "draft" && target.state !== "scheduled") {
    return NextResponse.json({ message: "Voter registers can only be changed before an election opens." }, { status: 409 });
  }
  if ((register[0]?.count ?? 0) > 0) {
    return NextResponse.json({ message: "This election already has a voter register. Review or replace it before importing another file." }, { status: 409 });
  }

  let file: File;
  try {
    const formData = await request.formData();
    const submitted = formData.get("file");
    if (!(submitted instanceof File)) throw new Error("missing file");
    file = submitted;
  } catch {
    return NextResponse.json({ message: "Choose a CSV file to import." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv") || file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ message: "Upload a non-empty CSV file smaller than 2 MB." }, { status: 400 });
  }

  const parsed = parseVoters(await file.text());
  if ("message" in parsed) return NextResponse.json(parsed, { status: 400 });

  const checksum = createHash("sha256").update(JSON.stringify(parsed.rows)).digest("hex");
  try {
    const [voterImport] = await db.insert(voterImports).values({
      electionId,
      uploadedByAdminId: admin.id,
      originalFilename: file.name.slice(0, 255),
      checksum,
      validationSummary: { acceptedRows: parsed.rows.length, rejectedRows: 0 },
      acceptedRows: parsed.rows.length,
      rejectedRows: 0,
      status: "committed",
      committedAt: new Date(),
    }).returning({ id: voterImports.id });

    await db.insert(studentEligibility).values(parsed.rows.map((row) => ({
      electionId,
      importId: voterImport.id,
      ...row,
      status: "eligible" as const,
    })));
    await db.insert(adminAuditEvents).values({
      actorAdminId: admin.id,
      action: "voter_register.imported",
      targetType: "election",
      targetId: electionId,
      metadata: { importId: voterImport.id, originalFilename: file.name, acceptedRows: parsed.rows.length, checksum },
    });
    return NextResponse.json({ importedCount: parsed.rows.length }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ message: "The voter register changed while this file was being imported. Refresh the page and try again." }, { status: 409 });
    }
    console.error("Unable to import voter register.", error);
    return NextResponse.json({ message: "Unable to import voters. Please try again." }, { status: 500 });
  }
}

function parseVoters(text: string): { rows: StudentRow[] } | { message: string } {
  const records = parseCsv(text);
  if (!records.length) return { message: "The CSV file is empty." };
  const headers = records[0].map((value) => value.trim().toLowerCase());
  if (REQUIRED_HEADERS.some((header, index) => headers[index] !== header)) {
    return { message: "Use these CSV headers in order: matric_number, full_name, school_email, level." };
  }
  const rows = records.slice(1).filter((row) => row.some((value) => value.trim()));
  if (!rows.length) return { message: "The CSV file has no voter rows." };
  if (rows.length > MAX_ROWS) return { message: "A voter register can contain at most 5,000 students." };

  const matricNumbers = new Set<string>();
  const emails = new Set<string>();
  const students: StudentRow[] = [];
  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const matricNumber = (row[0] ?? "").trim().replaceAll(" ", "");
    const fullName = (row[1] ?? "").trim();
    const schoolEmail = (row[2] ?? "").trim().toLowerCase();
    const level = (row[3] ?? "").trim();
    if (!MATRIC_PATTERN.test(matricNumber) || !fullName || !EMAIL_PATTERN.test(schoolEmail) || !level) {
      return { message: `Check row ${line}: matric number, full name, school email, and level are all required.` };
    }
    if (matricNumbers.has(matricNumber) || emails.has(schoolEmail)) {
      return { message: `Check row ${line}: matric numbers and school emails must be unique.` };
    }
    matricNumbers.add(matricNumber);
    emails.add(schoolEmail);
    students.push({ matricNumber, fullName, schoolEmail, level });
  }
  return { rows: students };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); rows.push(row); row = []; value = "";
    } else value += character;
  }
  if (quoted) return [];
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
