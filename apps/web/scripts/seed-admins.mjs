import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import { neon } from "@neondatabase/serverless";

const scrypt = promisify(scryptCallback);

if (process.env.SEED_INITIAL_ADMIN !== "true") {
  throw new Error(
    "Refusing to seed. Set SEED_INITIAL_ADMIN=true in .env to create the initial admin.",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const username = process.env.INITIAL_ADMIN_USERNAME?.trim();
const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!username || !email || !password) {
  throw new Error(
    "INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD are required.",
  );
}

if (password.length < 12) {
  throw new Error("INITIAL_ADMIN_PASSWORD must be at least 12 characters long.");
}

const sql = neon(databaseUrl);
const [existingAdmin] = await sql`
  select id
  from admins
  where username = ${username} or email = ${email}
  limit 1
`;

if (existingAdmin) {
  throw new Error(
    "An admin with this username or email already exists. This seed does not modify existing accounts.",
  );
}

const salt = randomBytes(16).toString("base64url");
const derivedKey = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt}$${Buffer.from(derivedKey).toString("base64url")}`;

await sql`
  insert into admins (
    id, username, email, password_hash, role, force_password_change, is_active
  ) values (
    ${randomUUID()},
    ${username},
    ${email},
    ${passwordHash},
    'super_admin',
    true,
    true
  )
`;

console.log(`Created initial super admin: ${username}.`);
