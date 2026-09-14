import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";

if (process.env.SEED_DEMO_DATA !== "true") {
  throw new Error(
    "Refusing to seed. Set SEED_DEMO_DATA=true in .env to insert demo students.",
  );
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const demoStudents = [
  {
    matricNumber: "2023/254442",
    fullName: "ABA CHEKWUBECHUKWU CANICE",
    schoolEmail: "chekwubeaba2022@gmail.com",
    level: "300",
  },
  {
    matricNumber: "2023/257045",
    fullName: "NOMEH IFEANYI SILAS",
    schoolEmail: "caniceaba@gmail.com",
    level: "300",
  },
];

const sql = neon(databaseUrl);

const [existingRegister] = await sql`
  select count(*)::int as count
  from student_eligibility
`;

if (existingRegister.count > 0) {
  throw new Error(
    "The voter register already contains records. This demo seed will not modify it.",
  );
}

const [existingElection] = await sql`
  select id
  from elections
  where state = 'draft'
  order by created_at asc
  limit 1
`;

let electionId = existingElection?.id;

if (!electionId) {
  electionId = randomUUID();
  const now = new Date();
  const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

  await sql`
    insert into elections (
      id, department_name, title, timezone, starts_at, ends_at, state
    ) values (
      ${electionId},
      'Computer Science',
      'NACOS Departmental Election',
      'Africa/Lagos',
      ${startsAt.toISOString()},
      ${endsAt.toISOString()},
      'draft'
    )
  `;
}

for (const student of demoStudents) {
  await sql`
    insert into student_eligibility (
      id, election_id, matric_number, full_name, school_email, level, status
    ) values (
      ${randomUUID()},
      ${electionId},
      ${student.matricNumber},
      ${student.fullName},
      ${student.schoolEmail},
      ${student.level},
      'eligible'
    )
  `;
}

console.log(
  `Seeded ${demoStudents.length} demo students for election ${electionId}.`,
);
