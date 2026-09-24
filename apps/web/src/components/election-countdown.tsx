"use client";

import { useEffect, useState } from "react";

type ElectionCountdownProps = {
  endsAt: Date;
  timezone: string;
};

function getRemainingTime(endsAt: Date) {
  const remainingSeconds = Math.max(
    0,
    Math.floor((endsAt.getTime() - Date.now()) / 1_000),
  );
  const hours = Math.floor(remainingSeconds / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatEndDate(endsAt: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
    timeZoneName: "short",
  })
    .format(endsAt)
    .replace(" at ", " · ")
    .replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase());
}

export function ElectionCountdown({ endsAt, timezone }: ElectionCountdownProps) {
  // The server and browser may render on opposite sides of a one-second
  // boundary. Start with a fixed value so hydration always matches, then
  // calculate the live countdown once the component has mounted.
  const [remainingTime, setRemainingTime] = useState("--:--:--");

  useEffect(() => {
    const updateRemainingTime = () => setRemainingTime(getRemainingTime(endsAt));
    updateRemainingTime();
    const interval = window.setInterval(updateRemainingTime, 1_000);

    return () => window.clearInterval(interval);
  }, [endsAt]);

  return (
    <>
      <p className="mt-1 font-mono text-3xl font-semibold tracking-[-0.06em] text-[#174d45] sm:text-4xl">
        {remainingTime}
      </p>
      <p className="mt-2 text-xs text-[#59746e]">
        {formatEndDate(endsAt, timezone)}
      </p>
    </>
  );
}
