import { desc } from "drizzle-orm";

import { AdminAccountManager } from "@/components/admin-account-manager";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";

export default async function AccountsPage() {
  const admin = await requireAdmin();
  const accounts = await db.select({ id: admins.id, username: admins.username, email: admins.email, role: admins.role, isActive: admins.isActive, createdAt: admins.createdAt }).from(admins).orderBy(desc(admins.createdAt));
  return (
    <AdminAccountManager initialAccounts={accounts} admin={{ username: admin.username, email: admin.email, role: admin.role, initials: admin.username.slice(0, 2).toUpperCase() }} />
  );
}
