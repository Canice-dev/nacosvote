"use client";

import { useEffect, useRef, useState } from "react";

import { AdminSidebar } from "@/components/admin-sidebar";

type Role = "super_admin" | "manager" | "observer";
type Account = {
  id: string;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date | string;
};

const roleLabel: Record<Role, string> = {
  super_admin: "Super admin",
  manager: "Manager",
  observer: "Observer",
};
const roleStyle: Record<Role, string> = {
  super_admin: "bg-[#eee8f8] text-[#65418c]",
  manager: "bg-[#e7f4ed] text-[#177052]",
  observer: "bg-[#edf0ef] text-[#5e6863]",
};

export function AdminAccountManager({
  initialAccounts,
  admin,
}: {
  initialAccounts: Account[];
  admin: { username: string; email: string; initials: string; role: Role };
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const canManageAccounts = admin.role === "super_admin";

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar {...admin} />
      <div className="lg:pl-(--admin-sidebar-width) transition-[padding] duration-200">
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#707773]">
                Admin accounts
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                Administrator accounts
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">
                Manage access for election administrators and observers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              disabled={!canManageAccounts}
              className="w-fit rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b493f] disabled:cursor-not-allowed disabled:bg-[#9ba9a4]"
            >
              Add administrator
            </button>
          </div>
          {!canManageAccounts && (
            <p className="mt-5 rounded-md border border-[#ead5aa] bg-[#fff9ea] px-4 py-3 text-sm text-[#795721]">
              Only super administrators can create accounts.
            </p>
          )}
          {notice && (
            <p
              className="mt-5 text-sm font-medium text-[#176353]"
              role="status"
            >
              {notice}
            </p>
          )}
          <div className="mt-7 overflow-hidden rounded-lg border border-[#e1e6e2] bg-white">
            <div className="border-b border-[#e9ece9] px-5 py-4">
              <h2 className="text-base font-semibold text-[#34403b]">
                All administrators
              </h2>
            </div>
            {accounts.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-[#737c77]">
                No administrator accounts exist yet.
              </p>
            ) : (
              <ul className="divide-y divide-[#edf0ed]">
                {accounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d9e7e2] text-sm font-semibold text-[#1c554c]">
                        {account.username.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#35413b]">
                          {account.username}
                        </p>
                        <p className="truncate text-sm text-[#7a837e]">
                          {account.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleStyle[account.role]}`}
                      >
                        {roleLabel[account.role]}
                      </span>
                      <span
                        className={`size-2 rounded-full ${account.isActive ? "bg-[#1f9a68]" : "bg-[#a6afaa]"}`}
                        aria-label={account.isActive ? "Active" : "Inactive"}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      {isDialogOpen && (
        <CreateAdminDialog
          onClose={() => setIsDialogOpen(false)}
          onCreated={(account) => {
            setAccounts((current) => [account, ...current]);
            setIsDialogOpen(false);
            setNotice(
              `${account.username} was added as ${roleLabel[account.role].toLowerCase()}.`,
            );
          }}
        />
      )}
    </main>
  );
}

function CreateAdminDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (account: Account) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);
  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      const result = (await response.json()) as {
        message?: string;
        admin?: Account;
      };
      if (!response.ok || !result.admin) {
        setError(result.message ?? "Unable to create the administrator.");
        return;
      }
      onCreated(result.admin);
    } catch {
      setError(
        "Unable to create the administrator. Check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-60 grid place-items-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close add administrator dialog"
        onClick={onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-[#15231f]/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-admin-title"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-admin-title"
              className="text-xl font-semibold tracking-[-0.02em] text-[#29332f]"
            >
              Add administrator
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#737c77]">
              Give a trusted team member access to the election system.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="-mr-2 -mt-2 grid size-9 place-items-center rounded-md text-xl text-[#68736e] hover:bg-[#edf1ee] disabled:opacity-50"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <form
          className="mt-6 grid gap-5 sm:grid-cols-2"
          onSubmit={createAccount}
        >
          <Field label="Username" htmlFor="admin-username">
            <input
              id="admin-username"
              name="username"
              ref={nameRef}
              required
              minLength={3}
              maxLength={60}
              className={inputClass}
            />
          </Field>
          <Field label="Email address" htmlFor="admin-email">
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              maxLength={254}
              className={inputClass}
            />
          </Field>
          <Field label="Role" htmlFor="admin-role">
            <select
              id="admin-role"
              name="role"
              defaultValue="manager"
              className={inputClass}
            >
              {(["super_admin", "manager", "observer"] as const).map((role) => (
                <option key={role} value={role}>
                  {roleLabel[role]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Temporary password" htmlFor="admin-password">
            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                required
                minLength={12}
                maxLength={200}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                className="absolute bottom-0 right-0 grid h-10.5 w-11 place-items-center rounded-r-md text-[#65716b] hover:text-[#176353]"
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
              >
                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </Field>
          <p className="sm:col-span-2 text-xs leading-5 text-[#75807a]">
            Use a secure temporary password and share it only with the new
            administrator.
          </p>
          {error && (
            <p className="sm:col-span-2 text-sm text-[#b42318]" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-1 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-[#cfd8d3] px-4 py-2.5 text-sm font-semibold text-[#44504a] hover:bg-[#f5f7f5] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b493f] disabled:cursor-not-allowed disabled:bg-[#9ba9a4]"
            >
              {isSaving ? "Adding..." : "Add administrator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "mt-2 block w-full rounded-md border border-[#cdd8d2] bg-white px-3 py-2.5 text-sm text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20";
function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="m3 3 18 18M10.6 6.2A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16.9 16.9 0 0 1-3.1 3.8M6.1 6.1C3.8 8.1 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 3.9-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[#3d4843]">
        {label}
      </label>
      {children}
    </div>
  );
}
