"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
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

export function StudentBallot() {
  const router = useRouter();
  const [ballot, setBallot] = useState<Ballot>();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
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

  const complete = useMemo(
    () =>
      ballot && ballot.positions.every((position) => selections[position.id]),
    [ballot, selections],
  );
  const currentPosition = ballot?.positions[currentPositionIndex];
  const progress = ballot
    ? ((currentPositionIndex + 1) / ballot.positions.length) * 100
    : 0;

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
      <p className="py-16 text-center text-sm text-[#52706b]">
        Loading your ballot…
      </p>
    );
  if (!ballot)
    return (
      <div className="rounded-2xl bg-[#fff1f0] p-5 text-sm text-[#9b312b]">
        {message ?? "Unable to load your ballot."}
      </div>
    );

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#176353]">
          {reviewing ? "Review your choices" : "Your ballot"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#17312f] sm:text-4xl">
          {ballot.election.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#52706b]">
          Select one candidate for each position. Your choices remain editable
          until final submission.
        </p>
      </div>

      {reviewing ? (
        <div className="space-y-4">
          {ballot.positions.map((position, index) => {
            const candidate = position.candidates.find(
              (item) => item.id === selections[position.id],
            );
            return (
              <div key={position.id} className="rounded-2xl bg-[#f7f8f5] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#66817b]">
                  {position.name}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#17312f]">
                  {candidate?.fullName}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPositionIndex(index);
                    setReviewing(false);
                  }}
                  className="mt-3 text-sm font-medium text-[#176353] underline"
                >
                  Edit choice
                </button>
              </div>
            );
          })}
        </div>
      ) : currentPosition ? (
        <section className="p-5 sm:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#315954]">
              <span>
                Position {currentPositionIndex + 1} of {ballot.positions.length}
              </span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-[#d9e5df]"
              role="progressbar"
              aria-label={`Position ${currentPositionIndex + 1} of ${ballot.positions.length}`}
              aria-valuemin={1}
              aria-valuemax={ballot.positions.length}
              aria-valuenow={currentPositionIndex + 1}
            >
              <div
                className="h-full rounded-full bg-[#16806b] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-[#17312f]">
            {currentPosition.name}
          </h2>
          <p className="mt-2 text-sm text-[#52706b]">
            Choose one candidate to continue.
          </p>
          <div className="mt-4 grid gap-3">
            {currentPosition.candidates.map((candidate) => (
              <label
                key={candidate.id}
                className={`flex cursor-pointer gap-4 rounded-xl border p-4 transition ${selections[currentPosition.id] === candidate.id ? "border-[#16806b] bg-[#edf8f3]" : "border-[#d9e5df] hover:border-[#9fc6ba]"}`}
              >
                <input
                  type="radio"
                  name={currentPosition.id}
                  checked={selections[currentPosition.id] === candidate.id}
                  onChange={() => {
                    setSelections((current) => ({
                      ...current,
                      [currentPosition.id]: candidate.id,
                    }));
                    setMessage(undefined);
                  }}
                  className="mt-1 size-4 accent-[#0e5a4f]"
                />
                <div>
                  {candidate.imageUrl && (
                    <Image
                      src={candidate.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="mb-3 size-12 rounded-full object-cover"
                    />
                  )}
                  <p className="font-semibold text-[#17312f]">
                    {candidate.fullName}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#52706b]">
                    {candidate.manifesto}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {message && (
        <p
          role="alert"
          className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#9b312b]"
        >
          {message}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
        {reviewing ? (
          <>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="h-12 rounded-xl px-5 text-sm font-semibold text-[#315954]"
            >
              Back to ballot
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="h-12 rounded-xl bg-[#0e5a4f] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit final ballot"}
            </button>
          </>
        ) : (
          <>
            {currentPositionIndex > 0 && (
              <button
                type="button"
                onClick={() => setCurrentPositionIndex((index) => index - 1)}
                className="h-12 rounded-xl px-5 text-sm font-semibold text-[#315954]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              disabled={!currentPosition || !selections[currentPosition.id]}
              onClick={() =>
                currentPositionIndex === ballot.positions.length - 1
                  ? setReviewing(true)
                  : setCurrentPositionIndex((index) => index + 1)
              }
              className="h-12 rounded-xl bg-[#0e5a4f] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentPositionIndex === ballot.positions.length - 1
                ? "Review ballot"
                : "Next position"}
            </button>
          </>
        )}
      </div>
      {reviewing && (
        <p className="text-center text-xs text-[#66817b]">
          Once submitted, your vote cannot be changed.
        </p>
      )}
    </div>
  );
}
