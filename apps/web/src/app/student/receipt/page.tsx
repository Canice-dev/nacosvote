"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function ReceiptPage() {
  const [receipt] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem("vote_receipt"),
  );
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col">
        <SiteHeader />
        <section className="flex flex-1 items-center py-12">
          <div className="w-full rounded-3xl border border-[#d9e5df] bg-white p-7 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-10">
            <p className="text-sm font-semibold text-[#176353]">
              Ballot submitted
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#17312f]">
              Thank you for voting.
            </h1>
            <p className="mt-5 text-base leading-7 text-[#52706b]">
              Your vote has been recorded anonymously and cannot be changed.
            </p>
            {receipt && (
              <div className="mt-7 rounded-2xl bg-[#edf8f3] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#52706b]">
                  Submission receipt
                </p>
                <p className="mt-2 break-all font-mono text-lg font-semibold text-[#17312f]">
                  {receipt}
                </p>
                <p className="mt-3 text-xs leading-5 text-[#52706b]">
                  Save this reference for your records. It does not reveal your
                  choices.
                </p>
              </div>
            )}
            <Link
              href="/"
              className="mt-8 inline-block text-sm font-semibold text-[#176353] underline"
            >
              Return to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
