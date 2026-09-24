"use client";

import { useEffect, useRef, useState } from "react";

import { AdminSidebar } from "@/components/admin-sidebar";
import { POSITION_TITLES } from "@/lib/position-titles";

type Election = {
  id: string;
  title: string;
  state: "draft" | "scheduled" | "open" | "closed" | "published";
};
type Position = { id: string; name: string; displayOrder: number };
type Candidate = {
  id: string;
  positionId: string;
  fullName: string;
  manifesto: string;
  displayOrder: number;
  isActive: boolean;
};

export function PositionManager({
  election,
  initialPositions,
  initialCandidates,
  admin,
}: {
  election: Election | null;
  initialPositions: Position[];
  initialCandidates: Candidate[];
  admin: { username: string; email: string; initials: string };
}) {
  const [positions, setPositions] = useState(initialPositions);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [candidatePosition, setCandidatePosition] = useState<Position | null>(
    null,
  );
  const [selectedTitle, setSelectedTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);
  const isEditable =
    election?.state === "draft" || election?.state === "scheduled";
  const addedTitles = new Set(positions.map((position) => position.name));

  useEffect(() => {
    if (!isDialogOpen) return;

    selectRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        setIsDialogOpen(false);
        setSelectedTitle("");
        setError("");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDialogOpen, isSaving]);

  function closeDialog() {
    if (isSaving) return;
    setIsDialogOpen(false);
    setSelectedTitle("");
    setError("");
  }

  async function addPosition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!election || !selectedTitle) {
      setError("Select a position title.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/elections/${election.id}/positions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: selectedTitle }),
        },
      );
      const result = (await response.json()) as {
        message?: string;
        position?: Position;
      };

      if (!response.ok || !result.position) {
        setError(result.message ?? "Unable to add position. Please try again.");
        return;
      }

      setPositions((currentPositions) => [
        ...currentPositions,
        result.position!,
      ]);
      setNotice(`${result.position.name} was added to this election.`);
      setIsDialogOpen(false);
      setSelectedTitle("");
    } catch {
      setError("Unable to add position. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar {...admin} />
      <div className="lg:pl-(--admin-sidebar-width) transition-[padding] duration-200">
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 border-b border-[#e5e6e2] pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#707773]">
                Positions & candidates
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                Positions and candidates
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">
                Add the offices being contested, then manage nominations for
                each position.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              disabled={!isEditable}
              className="w-fit rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b493f] disabled:cursor-not-allowed disabled:bg-[#9ba9a4]"
            >
              Add position
            </button>
          </div>

          {!election ? (
            <EmptyState message="Create an election before adding positions." />
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dce6e1] bg-[#f3f8f5] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#26423b]">
                    {election.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[#63716b]">
                    Election status: {election.state}
                  </p>
                </div>
                {!isEditable && (
                  <p className="text-sm font-medium text-[#8a5d22]">
                    Position setup is locked.
                  </p>
                )}
              </div>

              {notice && (
                <p
                  className="mt-5 text-sm font-medium text-[#176353]"
                  role="status"
                >
                  {notice}
                </p>
              )}

              {positions.length === 0 ? (
                <EmptyState message="No positions have been added yet." />
              ) : (
                <div className="mt-7 overflow-hidden rounded-lg border border-[#e1e6e2] bg-white">
                  <div className="border-b border-[#e9ece9] px-5 py-4">
                    <h2 className="text-base font-semibold text-[#34403b]">
                      Election positions
                    </h2>
                  </div>
                  <ol className="divide-y divide-[#edf0ed]">
                    {positions.map((position) => (
                      <li key={position.id} className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e7f0ec] text-sm font-semibold text-[#1f5c51]">
                            {position.displayOrder}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#313a36]">
                              {position.name}
                            </p>
                            <p className="mt-0.5 text-sm text-[#7a837e]">
                              {
                                candidates.filter(
                                  (candidate) =>
                                    candidate.positionId === position.id,
                                ).length
                              }{" "}
                              candidate(s)
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCandidatePosition(position)}
                            disabled={!isEditable}
                            className="shrink-0 rounded-md border border-[#b9cec5] px-3 py-2 text-sm font-semibold text-[#176052] hover:bg-[#edf5f1] disabled:cursor-not-allowed disabled:border-[#d9dfdc] disabled:text-[#98a19d]"
                          >
                            Add candidate
                          </button>
                        </div>
                        {candidates.filter(
                          (candidate) => candidate.positionId === position.id,
                        ).length > 0 && (
                          <ul className="ml-12 mt-4 space-y-2 border-l border-[#dfe8e3] pl-4">
                            {candidates
                              .filter(
                                (candidate) =>
                                  candidate.positionId === position.id,
                              )
                              .map((candidate) => (
                                <li
                                  key={candidate.id}
                                  className="text-sm text-[#58635e]"
                                >
                                  <span className="font-medium text-[#35413b]">
                                    {candidate.fullName}
                                  </span>
                                  {!candidate.isActive && " (inactive)"}
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {isDialogOpen && election && (
        <div
          className="fixed inset-0 z-60 grid place-items-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close add position dialog"
            onClick={closeDialog}
            className="absolute inset-0 bg-[#15231f]/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-position-title"
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="add-position-title"
                  className="text-xl font-semibold tracking-[-0.02em] text-[#29332f]"
                >
                  Add position
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[#737c77]">
                  Select an office to include in this election.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSaving}
                className="-mr-2 -mt-2 grid size-9 place-items-center rounded-md text-xl text-[#68736e] hover:bg-[#edf1ee] disabled:opacity-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form className="mt-6" onSubmit={addPosition}>
              <label
                htmlFor="position-title"
                className="text-sm font-semibold text-[#3d4843]"
              >
                Position title
              </label>
              <select
                id="position-title"
                ref={selectRef}
                value={selectedTitle}
                onChange={(event) => setSelectedTitle(event.target.value)}
                className="mt-2 block w-full rounded-md border border-[#cdd8d2] bg-white px-3 py-2.5 text-sm text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20"
              >
                <option value="">Select a position</option>
                {POSITION_TITLES.map((title) => (
                  <option
                    key={title}
                    value={title}
                    disabled={addedTitles.has(title)}
                  >
                    {title}
                    {addedTitles.has(title) ? " (Already added)" : ""}
                  </option>
                ))}
              </select>
              {error && (
                <p className="mt-2 text-sm text-[#b42318]" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isSaving}
                  className="rounded-md border border-[#cfd8d3] px-4 py-2.5 text-sm font-semibold text-[#44504a] hover:bg-[#f5f7f5] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedTitle || isSaving}
                  className="rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b493f] disabled:cursor-not-allowed disabled:bg-[#9ba9a4]"
                >
                  {isSaving ? "Adding…" : "Add position"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {candidatePosition && (
        <AddCandidateDialog
          position={candidatePosition}
          onClose={() => setCandidatePosition(null)}
          onCreated={(candidate) => {
            setCandidates((currentCandidates) => [
              ...currentCandidates,
              candidate,
            ]);
            setCandidatePosition(null);
            setNotice(
              `${candidate.fullName} was added to ${candidatePosition.name}.`,
            );
          }}
        />
      )}
    </main>
  );
}

function AddCandidateDialog({
  position,
  onClose,
  onCreated,
}: {
  position: Position;
  onClose: () => void;
  onCreated: (candidate: Candidate) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [portrait, setPortrait] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onClose]);

  async function addCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const imagePublicId = portrait
        ? await uploadPortrait(portrait, position.id)
        : undefined;
      const response = await fetch(
        `/api/admin/positions/${position.id}/candidates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, manifesto, imagePublicId }),
        },
      );
      const result = (await response.json()) as {
        message?: string;
        candidate?: Candidate;
      };

      if (!response.ok || !result.candidate) {
        setError(
          result.message ?? "Unable to add candidate. Please try again.",
        );
        return;
      }

      onCreated(result.candidate);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add candidate. Check your connection and try again.",
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
        aria-label="Close add candidate dialog"
        onClick={() => !isSaving && onClose()}
        className="absolute inset-0 bg-[#15231f]/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-candidate-title"
        className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-candidate-title"
              className="text-xl font-semibold tracking-[-0.02em] text-[#29332f]"
            >
              Add candidate
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#737c77]">
              Add a candidate for {position.name}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="-mr-2 -mt-2 grid size-9 place-items-center rounded-md text-xl text-[#68736e] hover:bg-[#edf1ee] disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form className="mt-6 space-y-5" onSubmit={addCandidate}>
          <div>
            <label
              htmlFor="candidate-name"
              className="text-sm font-semibold text-[#3d4843]"
            >
              Full name
            </label>
            <input
              id="candidate-name"
              ref={nameRef}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={120}
              required
              className="mt-2 block w-full rounded-md border border-[#cdd8d2] px-3 py-2.5 text-sm text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20"
            />
          </div>
          <div>
            <label
              htmlFor="candidate-manifesto"
              className="text-sm font-semibold text-[#3d4843]"
            >
              Manifesto
            </label>
            <textarea
              id="candidate-manifesto"
              value={manifesto}
              onChange={(event) => setManifesto(event.target.value)}
              maxLength={2000}
              required
              rows={5}
              className="mt-2 block w-full resize-y rounded-md border border-[#cdd8d2] px-3 py-2.5 text-sm text-[#303934] outline-none focus:border-[#1b6a5d] focus:ring-2 focus:ring-[#1b6a5d]/20"
            />
            <p className="mt-1 text-right text-xs text-[#7a837e]">
              {manifesto.length}/2000
            </p>
          </div>
          <div>
            <label
              htmlFor="candidate-portrait"
              className="text-sm font-semibold text-[#3d4843]"
            >
              Portrait{" "}
              <span className="font-normal text-[#77827c]">(optional)</span>
            </label>
            <input
              id="candidate-portrait"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setPortrait(event.target.files?.[0] ?? null)}
              disabled={isSaving}
              className="mt-2 block w-full text-sm text-[#5d6963] file:mr-3 file:rounded-md file:border-0 file:bg-[#e8f1ed] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#185d50] hover:file:bg-[#dcece5]"
            />
            <p className="mt-1.5 text-xs text-[#7a837e]">
              JPG, PNG, or WebP; maximum file size 5 MB.
            </p>
          </div>
          {error && (
            <p className="text-sm text-[#b42318]" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-1">
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
              disabled={!fullName.trim() || !manifesto.trim() || isSaving}
              className="rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b493f] disabled:cursor-not-allowed disabled:bg-[#9ba9a4]"
            >
              {isSaving ? "Adding…" : "Add candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

async function uploadPortrait(file: File, positionId: string) {
  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!supportedTypes.includes(file.type)) {
    throw new Error("Select a JPG, PNG, or WebP portrait.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("The portrait must be 5 MB or smaller.");
  }

  const signatureResponse = await fetch(
    `/api/admin/positions/${positionId}/candidate-image-signature`,
    {
      method: "POST",
    },
  );
  const signatureData = (await signatureResponse.json()) as {
    message?: string;
    cloudName?: string;
    apiKey?: string;
    folder?: string;
    uploadPreset?: string;
    timestamp?: number;
    signature?: string;
  };

  if (
    !signatureResponse.ok ||
    !signatureData.cloudName ||
    !signatureData.apiKey ||
    !signatureData.folder ||
    !signatureData.uploadPreset ||
    !signatureData.timestamp ||
    !signatureData.signature
  ) {
    throw new Error(
      signatureData.message ?? "Unable to prepare the portrait upload.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", String(signatureData.timestamp));
  formData.append("folder", signatureData.folder);
  formData.append("upload_preset", signatureData.uploadPreset);
  formData.append("signature", signatureData.signature);
  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  const uploadData = (await uploadResponse.json()) as {
    error?: { message?: string };
    public_id?: string;
  };

  if (!uploadResponse.ok || !uploadData.public_id) {
    throw new Error(
      uploadData.error?.message ?? "Unable to upload the portrait.",
    );
  }

  return uploadData.public_id;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-7 border border-dashed border-[#cfdad5] bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold text-[#39413e]">{message}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c78]">
        Use the Add position button to choose from the approved NACOS offices.
      </p>
    </div>
  );
}
