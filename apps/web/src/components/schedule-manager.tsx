"use client";

import { useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  PencilLine,
} from "lucide-react";

import { AdminSidebar } from "@/components/admin-sidebar";

type ElectionState = "draft" | "scheduled" | "open" | "closed" | "published";
type Election = {
  id: string;
  title: string;
  departmentName: string;
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
const editableStates: ElectionState[] = [
  "draft",
  "scheduled",
  "open",
  "closed",
];

export function ScheduleManager({
  initialElections,
  admin,
}: {
  initialElections: Election[];
  admin: { username: string; email: string; initials: string };
}) {
  const [elections, setElections] = useState(initialElections);
  const [editing, setEditing] = useState<Election | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function changeState(id: string, state: ElectionState) {
    setUpdatingId(id);
    setNotice("");
    setError("");
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
        setError(result.message ?? "Unable to update the election status.");
        return;
      }
      setElections((current) =>
        current.map((election) =>
          election.id === id ? result.election! : election,
        ),
      );
      setNotice(
        `${result.election.title} is now ${stateLabels[state].toLowerCase()}.`,
      );
    } catch {
      setError(
        "Unable to update the status. Check your connection and try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt") ?? "");
    const endsAt = String(form.get("endsAt") ?? "");
    const timezone = String(form.get("timezone") ?? "").trim();
    if (!startsAt || !endsAt || !timezone) {
      setError("Enter an opening time, closing time, and timezone.");
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError("The closing time must be after the opening time.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/elections/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt, endsAt, timezone }),
      });
      const result = (await response.json()) as {
        message?: string;
        election?: Election;
      };
      if (!response.ok || !result.election) {
        setError(result.message ?? "Unable to save the election schedule.");
        return;
      }
      setElections((current) =>
        current.map((election) =>
          election.id === editing.id ? result.election! : election,
        ),
      );
      setNotice(`Schedule updated for ${result.election.title}.`);
      setEditing(null);
    } catch {
      setError(
        "Unable to save the schedule. Check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar {...admin} />
      <div className="transition-[padding] duration-200 lg:pl-(--admin-sidebar-width)">
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#707773]">
                Schedule &amp; controls
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                Schedule and controls
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">
                Set each voting window and manage its election status.
              </p>
            </div>
          </div>

          {notice && (
            <p
              className="mt-5 text-sm font-medium text-[#176353]"
              role="status"
            >
              {notice}
            </p>
          )}
          {error && !editing && (
            <p className="mt-5 text-sm font-medium text-[#b42318]" role="alert">
              {error}
            </p>
          )}

          {elections.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-[#cfdad5] bg-white px-6 py-14 text-center">
              <CalendarClock
                className="mx-auto size-9 text-[#71817a]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-base font-semibold text-[#39413e]">
                No election schedule yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c78]">
                Create an election in Election setup to set its voting dates and
                control its status here.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {elections.map((election) => (
                <article
                  key={election.id}
                  className="rounded-2xl border border-[#e6e9e5] bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
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
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <ScheduleDate
                          label="Voting opens"
                          value={election.startsAt}
                          timezone={election.timezone}
                        />
                        <ScheduleDate
                          label="Voting closes"
                          value={election.endsAt}
                          timezone={election.timezone}
                        />
                      </div>
                      <p className="mt-3 text-xs text-[#808783]">
                        Timezone: {election.timezone}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-xs font-semibold text-[#59645e]">
                        Election status
                        <span className="relative mt-1.5 block">
                          <select
                            value={election.state}
                            disabled={
                              election.state === "published" ||
                              updatingId === election.id
                            }
                            onChange={(event) =>
                              changeState(
                                election.id,
                                event.target.value as ElectionState,
                              )
                            }
                            className="min-w-40 appearance-none rounded-lg border border-[#cdd8d2] bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20 disabled:cursor-not-allowed disabled:bg-[#f2f3f1]"
                          >
                            {editableStates.map((state) => (
                              <option key={state} value={state}>
                                {stateLabels[state]}
                              </option>
                            ))}
                            {election.state === "published" && (
                              <option value="published">Published</option>
                            )}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#4c4e4d]"
                            aria-hidden="true"
                          />
                        </span>
                      </label>
                      <button
                        type="button"
                        disabled={
                          election.state === "published" ||
                          updatingId === election.id
                        }
                        onClick={() => {
                          setError("");
                          setEditing(election);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#cfd8d3] px-3.5 py-2.5 text-sm font-semibold text-[#44504a] transition hover:bg-[#f5f7f5] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PencilLine className="size-4" aria-hidden="true" />
                        Edit schedule
                      </button>
                    </div>
                  </div>
                  {updatingId === election.id && (
                    <p className="mt-3 text-xs text-[#707773]">
                      Saving status…
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-60 grid place-items-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close schedule editor"
            onClick={() => !isSaving && setEditing(null)}
            className="absolute inset-0 bg-[#15231f]/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-dialog-title"
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="schedule-dialog-title"
              className="text-xl font-semibold tracking-[-0.02em] text-[#29332f]"
            >
              Edit voting schedule
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#737c77]">
              Update the voting window for {editing.title}.
            </p>
            <form
              className="mt-6 grid gap-5 sm:grid-cols-2"
              onSubmit={saveSchedule}
            >
              <label className="text-sm font-semibold text-[#3d4843]">
                Opens
                <input
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={toDateTimeInput(
                    editing.startsAt,
                    editing.timezone,
                  )}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold text-[#3d4843]">
                Closes
                <input
                  name="endsAt"
                  type="datetime-local"
                  required
                  defaultValue={toDateTimeInput(
                    editing.endsAt,
                    editing.timezone,
                  )}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold text-[#3d4843] sm:col-span-2">
                Timezone
                <input
                  name="timezone"
                  required
                  maxLength={100}
                  defaultValue={editing.timezone}
                  className={inputClass}
                />
              </label>
              {error && (
                <p
                  className="text-sm text-[#b42318] sm:col-span-2"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={isSaving}
                  className="rounded-lg border border-[#cfd8d3] px-4 py-2.5 text-sm font-semibold text-[#44504a] hover:bg-[#f5f7f5] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b493f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Clock3
                      className="size-4 animate-pulse"
                      aria-hidden="true"
                    />
                  ) : (
                    <Check className="size-4" aria-hidden="true" />
                  )}
                  {isSaving ? "Saving…" : "Save schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function ScheduleDate({
  label,
  value,
  timezone,
}: {
  label: string;
  value: string | Date;
  timezone: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Clock3
        className="mt-0.5 size-4 shrink-0 text-[#648179]"
        aria-hidden="true"
      />
      <div>
        <p className="text-xs text-[#808783]">{label}</p>
        <p className="mt-0.5 font-medium text-[#3e4944]">
          {formatDate(value, timezone)}
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string | Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    })
      .format(new Date(value))
      .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
  } catch {
    return new Date(value).toLocaleString();
  }
}

function toDateTimeInput(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts.map(({ type, value: part }) => [type, part]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

const inputClass =
  "mt-2 block w-full rounded-lg border border-[#cdd8d2] bg-white px-3 py-2.5 text-sm font-normal text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20";
