"use client";

import { useEffect, useRef, useState } from "react";

import { AdminSidebar } from "@/components/admin-sidebar";

type ElectionState = "draft" | "scheduled" | "open" | "closed" | "published";
type Election = {
  id: string;
  departmentName: string;
  title: string;
  timezone: string;
  startsAt: string | Date;
  endsAt: string | Date;
  state: ElectionState;
};

const stateLabels: Record<ElectionState, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  open: "Open",
  closed: "Closed",
  published: "Published",
};
const stateStyles: Record<ElectionState, string> = {
  draft: "bg-[#f1f2ef] text-[#5c645f]",
  scheduled: "bg-[#e9f1fb] text-[#285b8e]",
  open: "bg-[#e7f4ed] text-[#177052]",
  closed: "bg-[#f6ece8] text-[#8b4b34]",
  published: "bg-[#f0eafa] text-[#6c438d]",
};

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 13h10l1-13" />
    </svg>
  );
}

function WarningIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.3 3.8 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 4h.01" />
    </svg>
  );
}

export function ElectionManager({
  initialElections,
  admin,
}: {
  initialElections: Election[];
  admin: { username: string; email: string; initials: string };
}) {
  const [elections, setElections] = useState(initialElections);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [electionToDelete, setElectionToDelete] = useState<Election | null>(
    null,
  );

  async function updateState(id: string, state: ElectionState) {
    setUpdatingId(id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/elections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const result = (await response.json()) as {
        message?: string;
        election?: Election;
      };
      if (!response.ok || !result.election) {
        setNotice(result.message ?? "Unable to update the election status.");
        return;
      }
      setElections((current) =>
        current.map((election) =>
          election.id === id ? result.election! : election,
        ),
      );
      setNotice(
        `${result.election.title} is now ${stateLabels[result.election.state].toLowerCase()}.`,
      );
    } catch {
      setNotice(
        "Unable to update the election status. Check your connection and try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteElection(election: Election) {
    setDeletingId(election.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/elections/${election.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        message?: string;
        deletedId?: string;
      };
      if (!response.ok || !result.deletedId) {
        setNotice(result.message ?? "Unable to delete the election.");
        return;
      }
      setElections((current) =>
        current.filter((item) => item.id !== election.id),
      );
      setElectionToDelete(null);
      setNotice(`${election.title} was deleted.`);
    } catch {
      setNotice(
        "Unable to delete the election. Check your connection and try again.",
      );
    } finally {
      setDeletingId(null);
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
                Election setup
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                Elections
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">
                Create an election, set its voting window, and manage its
                lifecycle.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="w-fit rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b493f]"
            >
              Create election
            </button>
          </div>

          {notice && (
            <p
              className="mt-5 text-sm font-medium text-[#176353]"
              role="status"
            >
              {notice}
            </p>
          )}
          {elections.length === 0 ? (
            <div className="mt-7 border border-dashed border-[#cfdad5] bg-white px-6 py-14 text-center">
              <p className="text-base font-semibold text-[#39413e]">
                No elections have been created yet.
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c78]">
                Create your first election to begin setting up positions,
                candidates, and voters.
              </p>
            </div>
          ) : (
            <div className="mt-7 overflow-hidden rounded-lg border border-[#e1e6e2] bg-white">
              <div className="px-5 py-4">
                <h2 className="text-base font-semibold text-[#34403b]">
                  Election list
                </h2>
              </div>
              <ul className="divide-y divide-[#edf0ed]">
                {elections.map((election) => (
                  <li key={election.id} className="p-5">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-[#303a35]">
                            {election.title}
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateStyles[election.state]}`}
                          >
                            {stateLabels[election.state]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#69736e]">
                          {election.departmentName}
                        </p>
                        <p className="mt-2 text-xs text-[#7b847f]">
                          {formatDate(election.startsAt, election.timezone)} -{" "}
                          {formatDate(election.endsAt, election.timezone)} (
                          {election.timezone})
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-3 text-sm font-medium text-[#4c5752]">
                          Status
                          <select
                            value={election.state}
                            disabled={
                              election.state === "published" ||
                              updatingId === election.id ||
                              deletingId === election.id
                            }
                            onChange={(event) =>
                              updateState(
                                election.id,
                                event.target.value as ElectionState,
                              )
                            }
                            className="rounded-md border border-[#cdd8d2] bg-white px-3 py-2 text-sm text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20 disabled:cursor-not-allowed disabled:bg-[#f2f3f1]"
                          >
                            {(
                              ["draft", "scheduled", "open", "closed"] as const
                            ).map((state) => (
                              <option key={state} value={state}>
                                {stateLabels[state]}
                              </option>
                            ))}
                            {election.state === "published" && (
                              <option value="published">Published</option>
                            )}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => setElectionToDelete(election)}
                          disabled={
                            updatingId === election.id ||
                            deletingId === election.id
                          }
                          className="rounded-md border border-[#e3b8ad] px-3 py-2 text-sm font-semibold text-[#a33f2c] transition hover:bg-[#fff3f0] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <TrashIcon className="size-4" />
                            {deletingId === election.id
                              ? "Deleting..."
                              : "Delete"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      {isDialogOpen && (
        <CreateElectionDialog
          onClose={() => setIsDialogOpen(false)}
          onCreated={(election) => {
            setElections((current) => [election, ...current]);
            setIsDialogOpen(false);
            setNotice(
              `${election.title} was created as ${stateLabels[election.state].toLowerCase()}.`,
            );
          }}
        />
      )}
      {electionToDelete && (
        <DeleteElectionDialog
          election={electionToDelete}
          isDeleting={deletingId === electionToDelete.id}
          onClose={() => setElectionToDelete(null)}
          onConfirm={() => deleteElection(electionToDelete)}
        />
      )}
    </main>
  );
}

function DeleteElectionDialog({
  election,
  isDeleting,
  onClose,
  onConfirm,
}: {
  election: Election;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-60 grid place-items-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close delete election dialog"
        onClick={onClose}
        disabled={isDeleting}
        className="absolute inset-0 bg-[#15231f]/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-election-title"
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <span className="grid size-11 place-items-center rounded-full bg-[#fbeae6] text-[#ad422e]">
          <WarningIcon className="size-5" />
        </span>
        <h2
          id="delete-election-title"
          className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[#29332f]"
        >
          Delete election?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#626d67]">
          You are about to permanently delete{" "}
          <span className="font-semibold text-[#303a35]">{election.title}</span>
          . This action cannot be undone.
        </p>
        <p className="mt-2 text-xs leading-5 text-[#7a837e]">
          Elections with positions, voters, or ballots cannot be deleted.
        </p>
        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-md border border-[#cfd8d3] px-4 py-2.5 text-sm font-semibold text-[#44504a] hover:bg-[#f5f7f5] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md bg-[#b3422e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#913222] disabled:cursor-not-allowed disabled:bg-[#d39b91]"
          >
            <span className="inline-flex items-center gap-1.5">
              <TrashIcon className="size-4" />
              {isDeleting ? "Deleting..." : "Delete election"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateElectionDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (election: Election) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function createElection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const result = (await response.json()) as {
        message?: string;
        election?: Election;
      };
      if (!response.ok || !result.election) {
        setError(result.message ?? "Unable to create the election.");
        return;
      }
      onCreated(result.election);
    } catch {
      setError(
        "Unable to create the election. Check your connection and try again.",
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
        aria-label="Close create election dialog"
        onClick={() => !isSaving && onClose()}
        className="absolute inset-0 bg-[#15231f]/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-election-title"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="create-election-title"
              className="text-xl font-semibold tracking-[-0.02em] text-[#29332f]"
            >
              Create election
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#737c77]">
              Choose the election details and starting status.
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
          onSubmit={createElection}
        >
          <Field label="Election title" htmlFor="election-title">
            <input
              id="election-title"
              ref={titleRef}
              name="title"
              required
              maxLength={160}
              className={inputClass}
              placeholder="NACOS Election 2026"
            />
          </Field>
          <Field label="Department" htmlFor="election-department">
            <input
              id="election-department"
              name="departmentName"
              required
              maxLength={160}
              className={inputClass}
              placeholder="Computer Science"
            />
          </Field>
          <Field label="Starts" htmlFor="election-start">
            <input
              id="election-start"
              name="startsAt"
              type="datetime-local"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Ends" htmlFor="election-end">
            <input
              id="election-end"
              name="endsAt"
              type="datetime-local"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Timezone" htmlFor="election-timezone">
            <input
              id="election-timezone"
              name="timezone"
              required
              defaultValue="Africa/Lagos"
              maxLength={100}
              className={inputClass}
            />
          </Field>
          <Field label="Initial status" htmlFor="election-state">
            <select
              id="election-state"
              name="state"
              defaultValue="draft"
              className={inputClass}
            >
              {(["draft", "scheduled", "open", "closed"] as const).map(
                (state) => (
                  <option key={state} value={state}>
                    {stateLabels[state]}
                  </option>
                ),
              )}
            </select>
          </Field>
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
              {isSaving ? "Creating..." : "Create election"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "mt-2 block w-full rounded-md border border-[#cdd8d2] bg-white px-3 py-2.5 text-sm text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20";
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
function formatDate(value: string | Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}
