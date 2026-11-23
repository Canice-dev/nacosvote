"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";

import { AdminSidebar } from "@/components/admin-sidebar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
  admin: {
    id: string;
    username: string;
    email: string;
    initials: string;
    role: Role;
  };
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Role>>({});
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(
    null,
  );
  const canManageAccounts = admin.role === "super_admin";

  async function updateRole(account: Account) {
    const role = roleDrafts[account.id] ?? account.role;
    if (role === account.role) return;
    setUpdatingAccountId(account.id);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = (await response.json()) as {
        message?: string;
        admin?: { id: string; role: Role };
      };
      if (!response.ok || !result.admin) {
        setActionError(
          result.message ?? "Unable to update the administrator role.",
        );
        return;
      }
      setAccounts((current) =>
        current.map((item) =>
          item.id === account.id ? { ...item, role: result.admin!.role } : item,
        ),
      );
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[account.id];
        return next;
      });
      setNotice(
        `${account.username}'s role was updated to ${roleLabel[result.admin.role]}.`,
      );
    } catch {
      setActionError(
        "Unable to update the administrator role. Check your connection and try again.",
      );
    } finally {
      setUpdatingAccountId(null);
    }
  }

  async function deleteAccount(account: Account) {
    setUpdatingAccountId(account.id);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setActionError(
          result.message ?? "Unable to delete the administrator account.",
        );
        return;
      }
      setAccounts((current) =>
        current.filter((item) => item.id !== account.id),
      );
      setDeleteTarget(null);
      setNotice(`${account.username}'s administrator account was deleted.`);
    } catch {
      setActionError(
        "Unable to delete the administrator account. Check your connection and try again.",
      );
    } finally {
      setUpdatingAccountId(null);
    }
  }

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
          {actionError && (
            <p className="mt-3 text-sm text-[#b42318]" role="alert">
              {actionError}
            </p>
          )}
          <div className="mt-7 overflow-hidden rounded-lg border border-[#e1e6e2] bg-white">
            <div className="border-b border-[#e9ece9] px-5 py-4">
              <h2 className="text-base font-semibold text-[#34403b]">
                All administrators
              </h2>
            </div>
            {accounts.filter((account) => account.isActive).length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-[#737c77]">
                No active administrator accounts exist.
              </p>
            ) : (
              <ul className="divide-y divide-[#edf0ed]">
                {accounts
                  .filter((account) => account.isActive)
                  .map((account) => (
                    <li
                      key={account.id}
                      className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e84e3c] text-xs font-medium text-white">
                          {account.username.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-[#35413b]">
                            {account.username}
                          </p>
                          <VerifiedBadge role={account.role} />
                        </div>
                          <p className="truncate text-sm text-[#7a837e]">
                            {account.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {canManageAccounts ? (
                          <>
                            <div className="relative">
                              <select
                                aria-label={`Role for ${account.username}`}
                                value={roleDrafts[account.id] ?? account.role}
                                disabled={updatingAccountId === account.id}
                                onChange={(event) =>
                                  setRoleDrafts((current) => ({
                                    ...current,
                                    [account.id]: event.target.value as Role,
                                  }))
                                }
                                className={`appearance-none rounded-md border border-[#cdd8d2] bg-white py-2 pl-3 pr-9 text-xs font-semibold outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20 ${roleStyle[roleDrafts[account.id] ?? account.role]}`}
                              >
                                {(
                                  [
                                    "super_admin",
                                    "manager",
                                    "observer",
                                  ] as const
                                ).map((role) => (
                                  <option key={role} value={role}>
                                    {roleLabel[role]}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-[#4c4e4d]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => updateRole(account)}
                              disabled={
                                updatingAccountId === account.id ||
                                (roleDrafts[account.id] ?? account.role) ===
                                  account.role
                              }
                              className="rounded-md border border-[#cfd8d3] px-3 py-2 text-xs font-semibold text-[#44504a] hover:bg-[#f5f7f5] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save role
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionError("");
                                setDeleteTarget(account);
                              }}
                              disabled={
                                updatingAccountId === account.id ||
                                account.id === admin.id
                              }
                              aria-label={`Delete ${account.username}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-[#efc9c5] px-3 py-2 text-xs font-semibold text-[#a12d24] hover:bg-[#fff5f4] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                              Delete
                            </button>
                          </>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleStyle[account.role]}`}
                          >
                            {roleLabel[account.role]}
                          </span>
                        )}
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
      {deleteTarget && (
        <DeleteAdminDialog
          account={deleteTarget}
          error={actionError}
          isDeleting={updatingAccountId === deleteTarget.id}
          onClose={() => {
            setDeleteTarget(null);
            setActionError("");
          }}
          onConfirm={() => deleteAccount(deleteTarget)}
        />
      )}
    </main>
  );
}

function DeleteAdminDialog({
  account,
  error,
  isDeleting,
  onClose,
  onConfirm,
}: {
  account: Account;
  error: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
    >
      <AlertDialogContent
        overlayClassName="z-80 bg-[#15231f]/45 backdrop-blur-sm"
        className="z-90 gap-5 p-6"
      >
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-xl font-semibold tracking-[-0.02em] text-[#29332f]">
            Delete administrator?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-[#737c77]">
            {account.username} will lose access immediately. Their record will
            remain for election and audit history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm text-[#b42318]" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter className="mt-1 flex-row justify-end border-0 bg-transparent p-0">
          <AlertDialogCancel
            disabled={isDeleting}
            className="h-auto rounded-md border-[#cfd8d3] px-4 py-2.5 text-sm font-semibold text-[#44504a] hover:bg-[#f5f7f5]"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-auto rounded-md bg-[#b42318] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#941f17]"
          >
            {isDeleting ? "Deleting..." : "Delete administrator"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
            <X size={20} />
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
            <div className="relative mt-2">
              <select
                id="admin-role"
                name="role"
                defaultValue="manager"
                className="block w-full appearance-none rounded-md border border-[#cdd8d2] bg-white py-2.5 pl-3 pr-10 text-sm text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20"
              >
                {(["super_admin", "manager", "observer"] as const).map(
                  (role) => (
                    <option key={role} value={role}>
                      {roleLabel[role]}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#4c4e4d]"
              />
            </div>
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

function VerifiedBadge({ role }: { role: Role }) {
  const color =
    role === "super_admin"
      ? "#d4a017"
      : role === "manager"
        ? "#1d9bf0"
        : "#9aa4ad";

  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      role="img"
      aria-label={`${roleLabel[role]} verified`}
    >
      <title>{`${roleLabel[role]} verified`}</title>
      <path
        fill={color}
        d="m12 1.75 2.5 1.4 2.86-.2 1.18 2.62 2.57 1.28-.52 2.82L22 12l-1.41 2.33.2 2.86-2.62 1.18-1.28 2.57-2.82-.52L12 22l-2.33-1.41-2.86.2-1.18-2.62-2.57-1.28.52-2.82L2 12l1.41-2.33-.2-2.86 2.62-1.18 1.28-2.57 2.82.52L12 1.75Z"
      />
      <path
        d="m8.1 12.2 2.45 2.4 5.35-5.4"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

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
