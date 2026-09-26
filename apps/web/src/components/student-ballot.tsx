"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Candidate = {
  id: string;
  fullName: string;
  manifesto: string;
  imageUrl: string | null;
};
type Position = { id: string; name: string; candidates: Candidate[] };
type Ballot = {
  election: { title: string; endsAt: string };
  positions: Position[];
};

function candidateInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();
}

function deadlineLabel(endsAt: string) {
  const deadline = new Date(endsAt);
  if (Number.isNaN(deadline.getTime())) return null;
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(deadline);
}

export function StudentBallot() {
  const router = useRouter();
  const [ballot, setBallot] = useState<Ballot>();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [expandedManifesto, setExpandedManifesto] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/student/ballot")
      .then(async (response) => {
        const result = (await response.json()) as Ballot & { message?: string };
        if (!response.ok)
          throw new Error(result.message ?? "Unable to load your ballot.");
        setBallot(result);
      })
      .catch((error: unknown) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your ballot.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const selectedCount = useMemo(
    () =>
      ballot?.positions.filter((position) => selections[position.id]).length ??
      0,
    [ballot, selections],
  );
  const complete = Boolean(ballot && selectedCount === ballot.positions.length);
  const currentPosition = ballot?.positions[currentPositionIndex];
  const completionPercent = ballot?.positions.length
    ? (selectedCount / ballot.positions.length) * 100
    : 0;
  const deadline = ballot ? deadlineLabel(ballot.election.endsAt) : null;

  function selectPosition(index: number) {
    setCurrentPositionIndex(index);
    setReviewing(false);
    setExpandedManifesto(undefined);
  }

  async function submit() {
    if (!ballot || !complete) return;
    setSubmitting(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/student/ballot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: Object.entries(selections).map(
            ([positionId, candidateId]) => ({ positionId, candidateId }),
          ),
        }),
      });
      const result: { receipt?: string; message?: string } =
        await response.json();
      if (!response.ok || !result.receipt)
        throw new Error(result.message ?? "Unable to submit your ballot.");
      sessionStorage.setItem("vote_receipt", result.receipt);
      router.replace("/student/receipt");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit your ballot.",
      );
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="rounded-3xl border border-[#d9e5df] bg-white px-6 py-16 text-center text-sm text-[#52706b] shadow-[0_20px_50px_-38px_rgba(20,73,62,0.5)]">
        Loading your ballot…
      </div>
    );
  if (!ballot)
    return (
      <div className="rounded-3xl border border-[#f1cdc7] bg-[#fff8f6] p-6 text-sm text-[#9b312b]">
        {message ?? "Unable to load your ballot."}
      </div>
    );

  return (
    <div className="w-full">
      <header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-[#176353]">
            Secure student ballot
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#17312f] sm:text-4xl">
            {ballot.election.title}
          </h1>
        </div>
        {deadline && (
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#d9e5df] bg-white px-3.5 py-2 text-xs font-semibold text-[#315954] sm:self-auto">
            <Clock3 className="size-4 text-[#176353]" aria-hidden="true" />
            Closes {deadline}
          </div>
        )}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[#d9e5df] bg-white p-4 shadow-[0_18px_45px_-38px_rgba(20,73,62,0.6)] lg:sticky lg:top-24">
          <div className="px-2 pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-bold text-[#17312f]">Your ballot</p>
              <span className="text-xs font-semibold text-[#176353]">
                {selectedCount} of {ballot.positions.length}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dce8e4]">
              <div
                className="h-full rounded-full bg-[#16806b] transition-[width] duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
          <nav aria-label="Ballot positions" className="space-y-1">
            {ballot.positions.map((position, index) => {
              const isSelected = Boolean(selections[position.id]);
              const isCurrent = !reviewing && currentPositionIndex === index;
              return (
                <button
                  key={position.id}
                  type="button"
                  onClick={() => selectPosition(index)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e5a4f] ${isCurrent ? "bg-[#edf8f3] text-[#0e5a4f]" : "text-[#52706b] hover:bg-[#f7f8f5]"}`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[#16806b] bg-[#16806b] text-white" : isCurrent ? "border-[#16806b]" : "border-[#b8ccc5]"}`}
                  >
                    {isSelected ? (
                      <Check className="size-3" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {position.name}
                  </span>
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            disabled={!complete}
            onClick={() => setReviewing(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#c6dbd4] px-4 py-3 text-sm font-semibold text-[#176353] transition hover:bg-[#edf8f3] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Review choices <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </aside>

        <section
          aria-label="Ballot selection"
          className="overflow-hidden rounded-3xl border border-[#d9e5df] bg-white shadow-[0_22px_55px_-40px_rgba(20,73,62,0.6)]"
        >
          {reviewing ? (
            <section className="p-6 sm:p-8">
              <p className="text-sm font-bold text-[#176353]">Final check</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#17312f] sm:text-3xl">
                Review your choices
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#52706b]">
                Confirm each selection before submitting. Your ballot becomes
                final once submitted.
              </p>
              <div className="mt-7 divide-y divide-[#e3ece8] rounded-2xl border border-[#dce8e4]">
                {ballot.positions.map((position, index) => {
                  const candidate = position.candidates.find(
                    (item) => item.id === selections[position.id],
                  );
                  return (
                    <div
                      key={position.id}
                      className="flex items-center gap-4 p-4 sm:p-5"
                    >
                      <CandidateAvatar candidate={candidate} size="small" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#71857f]">
                          {position.name}
                        </p>
                        <p className="mt-1 truncate font-semibold text-[#17312f]">
                          {candidate?.fullName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectPosition(index)}
                        className="text-sm font-semibold text-[#176353] underline underline-offset-4"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
              <ActionBar
                reviewing
                onBack={() => setReviewing(false)}
                onSubmit={submit}
                submitting={submitting}
              />
            </section>
          ) : currentPosition ? (
            <section>
              <div className="border-b border-[#e3ece8] px-6 py-6 sm:px-8 sm:py-7">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#71857f]">
                  Position {currentPositionIndex + 1} of{" "}
                  {ballot.positions.length}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#17312f] sm:text-3xl">
                  {currentPosition.name}
                </h2>
                <p className="mt-3 text-sm text-[#52706b]">
                  Choose one candidate. You can change this choice before final
                  submission.
                </p>
              </div>
              <fieldset className="space-y-3 px-6 py-6 sm:px-8 sm:py-7">
                <legend className="sr-only">
                  Candidates for {currentPosition.name}
                </legend>
                {currentPosition.candidates.length ? (
                  currentPosition.candidates.map((candidate) => {
                    const selected =
                      selections[currentPosition.id] === candidate.id;
                    const manifestoOpen = expandedManifesto === candidate.id;
                    return (
                      <label
                        key={candidate.id}
                        className={`block cursor-pointer rounded-2xl border p-4 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0e5a4f] sm:p-5 ${selected ? "border-2 border-[#16806b] bg-[#edf8f3]" : "border-[#d9e5df] bg-white hover:border-[#9fc6ba] hover:bg-[#fbfdfc]"}`}
                      >
                        <input
                          type="radio"
                          name={currentPosition.id}
                          checked={selected}
                          onChange={() => {
                            setSelections((current) => ({
                              ...current,
                              [currentPosition.id]: candidate.id,
                            }));
                            setMessage(undefined);
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-4">
                          <CandidateAvatar candidate={candidate} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-lg font-semibold text-[#17312f]">
                                {candidate.fullName}
                              </p>
                              {selected && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#d5f0e4] px-2 py-0.5 text-xs font-bold text-[#0e5a4f]">
                                  <Check
                                    className="size-3"
                                    aria-hidden="true"
                                  />{" "}
                                  Selected
                                </span>
                              )}
                            </div>
                            {candidate.manifesto && (
                              <>
                                <p
                                  className={`mt-2 text-sm leading-6 text-[#52706b] ${manifestoOpen ? "" : "line-clamp-2"}`}
                                >
                                  {candidate.manifesto}
                                </p>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    setExpandedManifesto(
                                      manifestoOpen ? undefined : candidate.id,
                                    );
                                  }}
                                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#176353] underline underline-offset-4"
                                >
                                  {manifestoOpen
                                    ? "Show less"
                                    : "View manifesto"}
                                  {manifestoOpen ? (
                                    <ChevronUp
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ChevronDown
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                          <span
                            className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-[#0e5a4f] bg-[#0e5a4f] text-white" : "border-[#aabbb5]"}`}
                          >
                            {selected && (
                              <Check className="size-3.5" aria-hidden="true" />
                            )}
                          </span>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="rounded-2xl bg-[#f7f8f5] p-5 text-sm text-[#52706b]">
                    There are no candidates for this position yet.
                  </p>
                )}
              </fieldset>
              <div className="border-t border-[#e3ece8] px-6 py-4 sm:px-8">
                <ActionBar
                  canGoBack={currentPositionIndex > 0}
                  canContinue={Boolean(selections[currentPosition.id])}
                  isLast={currentPositionIndex === ballot.positions.length - 1}
                  onBack={() => selectPosition(currentPositionIndex - 1)}
                  onNext={() =>
                    currentPositionIndex === ballot.positions.length - 1
                      ? setReviewing(true)
                      : selectPosition(currentPositionIndex + 1)
                  }
                />
              </div>
            </section>
          ) : null}
        </section>
      </div>
      {message && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-[#f1cdc7] bg-[#fff8f6] px-4 py-3 text-sm text-[#9b312b]"
        >
          {message}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-xs text-[#66817b]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-[#176353]" aria-hidden="true" />
          Your selections are private
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LockKeyhole className="size-3.5 text-[#176353]" aria-hidden="true" />
          Final submission cannot be changed
        </span>
      </div>
    </div>
  );
}

function CandidateAvatar({
  candidate,
  size = "large",
}: {
  candidate?: Candidate;
  size?: "large" | "small";
}) {
  const dimensions = size === "small" ? "size-10 text-xs" : "size-14 text-sm";
  if (!candidate)
    return (
      <div className={`${dimensions} shrink-0 rounded-full bg-[#dce8e4]`} />
    );
  return candidate.imageUrl ? (
    <Image
      src={candidate.imageUrl}
      alt={`Portrait of ${candidate.fullName}`}
      width={56}
      height={56}
      className={`${dimensions} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-[#dce8e4] font-bold text-[#315954]`}
    >
      {candidateInitials(candidate.fullName)}
    </div>
  );
}

function ActionBar({
  reviewing = false,
  canGoBack = true,
  canContinue = true,
  isLast = false,
  onBack,
  onNext,
  onSubmit,
  submitting = false,
}: {
  reviewing?: boolean;
  canGoBack?: boolean;
  canContinue?: boolean;
  isLast?: boolean;
  onBack: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  submitting?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#315954] transition hover:bg-[#f1f6f3] ${!canGoBack ? "invisible" : ""}`}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {reviewing ? "Back to ballot" : "Previous"}
      </button>
      {reviewing ? (
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0e5a4f] px-6 text-sm font-bold text-white transition hover:bg-[#08453d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {submitting ? "Submitting…" : "Submit final ballot"}
        </button>
      ) : (
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0e5a4f] px-6 text-sm font-bold text-white transition hover:bg-[#08453d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? "Review ballot" : "Next position"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
