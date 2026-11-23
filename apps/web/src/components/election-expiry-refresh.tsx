"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ElectionExpiryRefreshProps = {
  elections: Array<{ state: string; endsAt: string | Date }>;
};

export function ElectionExpiryRefresh({ elections }: ElectionExpiryRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const nextEndTime = elections
      .filter((election) => election.state === "open")
      .map((election) => new Date(election.endsAt).getTime())
      .filter((endsAt) => Number.isFinite(endsAt))
      .sort((a, b) => a - b)[0];

    if (nextEndTime === undefined) return;

    const timeout = window.setTimeout(
      () => router.refresh(),
      Math.max(0, nextEndTime - Date.now()) + 250,
    );

    return () => window.clearTimeout(timeout);
  }, [elections, router]);

  return null;
}
