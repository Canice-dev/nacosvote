"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ClipboardList, Search, X } from "lucide-react";

import { AdminSidebar } from "@/components/admin-sidebar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type AuditEvent = {
  id: string;
  actorAdminId: string | null;
  actorUsername: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
  dateLabel: string;
};

export function AuditLogManager({
  initialEvents,
  admin,
}: {
  initialEvents: AuditEvent[];
  admin: { username: string; email: string; initials: string };
}) {
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const events = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return initialEvents;
    return initialEvents.filter((event) =>
      [
        event.action,
        event.targetType,
        event.targetId ?? "",
        event.actorUsername ?? "",
        event.actorEmail ?? "",
        event.reason ?? "",
        metadataText(event.metadata),
      ].some((value) => value.toLowerCase().includes(search)),
    );
  }, [initialEvents, query]);

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar {...admin} />
      <div className="transition-[padding] duration-200 lg:pl-(--admin-sidebar-width)">
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#707773]">
                Administration
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                Audit log
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">
                Review who changed election settings and when those actions
                occurred.
              </p>
            </div>
            <p className="text-sm text-[#737c77]">
              Latest {initialEvents.length} events
            </p>
          </div>

          <label className="mt-6 flex max-w-lg items-center gap-2.5 rounded-xl border border-[#dfe4e0] bg-white px-3.5 py-2.5 text-[#7a837e] focus-within:border-[#1b6a5d] focus-within:ring-2 focus-within:ring-[#1b6a5d]/15">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Search audit events</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search action, admin, or details"
              className="w-full bg-transparent text-sm text-[#303934] outline-none placeholder:text-[#929994]"
            />
          </label>

          {initialEvents.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#cfdad5] bg-white px-6 py-14 text-center">
              <ClipboardList
                className="mx-auto size-9 text-[#71817a]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-base font-semibold text-[#39413e]">
                No audit activity yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c78]">
                Admin actions will appear here as they are recorded.
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#e6e9e5] bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-[#59645e]">
                No events match “{query}”.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 text-sm font-semibold text-[#176356] hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl bg-white">
              <div className="flex items-center justify-between border-b border-[#edf0ed] px-5 py-3.5">
                <h2 className="text-sm font-semibold text-[#47524c]">
                  Activity
                </h2>
                <span className="text-xs text-[#808783]">
                  {events.length} {events.length === 1 ? "event" : "events"}
                </span>
              </div>
              <ul>
                {events.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-[#f8faf8] focus-visible:bg-[#f5f8f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1b6a5d] sm:gap-4 sm:px-5"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf4f0] text-[#397166]">
                        <ClipboardList
                          className="size-4.5"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#34403b]">
                          {eventSummary(event)}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#7a837e]">
                          <span>
                            {event.actorUsername ??
                              event.actorEmail ??
                              "Admin unavailable"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{event.dateLabel}</span>
                        </span>
                      </span>
                      <span className="hidden rounded-full bg-[#f1f4f2] px-2.5 py-1 text-xs font-medium text-[#64716b] sm:inline-flex">
                        {humanize(event.targetType)}
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-[#8a928d]"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <Drawer
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        swipeDirection="right"
      >
        <DrawerContent className="inset-y-1.25! right-1.25! h-[calc(100dvh-10px)]! w-[calc(100vw-10px)] max-w-[100vw] rounded-xl border border-[#e5e9e5] bg-white shadow-xl overflow-x-hidden overflow-y-auto sm:w-[min(32rem,90vw)]">
          {selectedEvent && (
            <>
              <DrawerHeader className="p-6 pb-5 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DrawerTitle className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#29332f]">
                      {eventSummary(selectedEvent)}
                    </DrawerTitle>
                    <DrawerDescription className="mt-1.5 text-sm leading-6 text-[#737c77]">
                      Recorded {selectedEvent.dateLabel} (Africa/Lagos)
                    </DrawerDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    aria-label="Close event details"
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-[#68736e] transition hover:bg-[#e9eeeb]"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
              </DrawerHeader>
              <div className="space-y-7 overflow-y-auto p-6">
                <div className="flex items-center gap-3 pb-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e84e3c] text-xs font-medium text-white">
                    {getInitials(selectedEvent.actorUsername)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-[#808783]">Performed by</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-[#34403b]">
                      {selectedEvent.actorUsername ?? "Admin unavailable"}
                    </p>
                    {selectedEvent.actorEmail && (
                      <p className="mt-0.5 truncate text-xs text-[#7a837e]">
                        {selectedEvent.actorEmail}
                      </p>
                    )}
                  </div>
                </div>

                <section>
                  <h3 className="text-sm font-semibold text-[#34403b]">
                    Action
                  </h3>
                  <dl className="mt-2 divide-y divide-[#e9edea]">
                    <DetailRow
                      label="Event"
                      value={humanize(selectedEvent.action)}
                    />
                    <DetailRow
                      label="Target type"
                      value={humanize(selectedEvent.targetType)}
                    />
                    {selectedEvent.targetId && (
                      <DetailRow
                        label="Target ID"
                        value={selectedEvent.targetId}
                        mono
                      />
                    )}
                    <DetailRow
                      label="Date and time"
                      value={`${selectedEvent.dateLabel} (Africa/Lagos)`}
                    />
                  </dl>
                </section>

                {selectedEvent.reason && (
                  <section className="border-l-2 border-[#bfd2ca] pl-3">
                    <h3 className="text-sm font-semibold text-[#34403b]">
                      Reason
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#4c5752]">
                      {selectedEvent.reason}
                    </p>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold text-[#34403b]">
                    Recorded details
                  </h3>
                  <MetadataDetails metadata={selectedEvent.metadata} />
                </section>
                <p className="break-all pt-4 font-mono text-[11px] text-[#929994]">
                  Event ID: {selectedEvent.id}
                </p>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <dt className="text-xs text-[#808783]">{label}</dt>
      <dd
        className={`break-all text-sm text-[#3e4944] ${mono ? "font-mono text-xs" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function MetadataDetails({ metadata }: { metadata: unknown }) {
  if (!isObject(metadata) || Object.keys(metadata).length === 0) {
    return (
      <p className="mt-2 text-sm text-[#7a837e]">
        No extra details were recorded.
      </p>
    );
  }
  return (
    <dl className="mt-2 divide-y divide-[#e9edea]">
      {Object.entries(metadata).map(([key, value]) => (
        <DetailRow
          key={key}
          label={humanize(key)}
          value={formatMetadataValue(key, value, metadata)}
          mono={key.toLowerCase().endsWith("id")}
        />
      ))}
    </dl>
  );
}

function eventSummary(event: AuditEvent) {
  const details = isObject(event.metadata) ? event.metadata : {};
  const subject =
    typeof details.title === "string"
      ? details.title
      : typeof details.username === "string"
        ? details.username
        : null;
  const action = humanize(event.action);
  return subject ? `${action}: ${subject}` : action;
}

function getInitials(username: string | null) {
  return username?.slice(0, 2).toUpperCase() || "AD";
}

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatMetadataValue(
  key: string,
  value: unknown,
  metadata: Record<string, unknown>,
) {
  if (value === null || value === undefined || value === "") return "—";
  if ((key === "startsAt" || key === "endsAt") && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const timezone =
        typeof metadata.timezone === "string"
          ? metadata.timezone
          : "Africa/Lagos";
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
          .format(date)
          .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
      } catch {
        return date.toLocaleString();
      }
    }
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if ((key === "from" || key === "to") && typeof value === "string")
    return humanize(value);
  return String(value);
}

function metadataText(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}
