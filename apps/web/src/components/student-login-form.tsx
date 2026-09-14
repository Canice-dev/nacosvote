"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "matric" | "otp";

export function StudentLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("matric");
  const [matricNumber, setMatricNumber] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/student/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricNumber }),
      });
      const result: { message?: string; developmentCode?: string } =
        await response.json();

      if (!response.ok) {
        setMessage(result.message ?? "Unable to start sign-in.");
        return;
      }

      const developmentHint = result.developmentCode
        ? ` Development code: ${result.developmentCode}`
        : "";
      setMessage(
        `${result.message ?? "Enter the code to continue."}${developmentHint}`,
      );
      setStep("otp");
    } catch {
      setMessage("Unable to reach the sign-in service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/student/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricNumber, code }),
      });
      const result: {
        message?: string;
        nextPath?: string;
        developmentError?: string;
      } = await response.json();

      if (!response.ok || !result.nextPath) {
        const developmentHint = result.developmentError
          ? ` Development error: ${result.developmentError}`
          : "";
        setMessage(
          `${result.message ?? "Unable to verify your code."}${developmentHint}`,
        );
        return;
      }

      router.push(result.nextPath);
    } catch {
      setMessage("Unable to reach the sign-in service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md justify-self-end rounded-3xl border border-[#d9e5df] bg-white p-6 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-[#176353]">
            Student sign in
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17312f]">
            {step === "matric" ? "Let’s verify you" : "Enter your code"}
          </h2>
        </div>
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf8f3] text-[#176353]"
          aria-hidden="true"
        >
          →
        </span>
      </div>

      {step === "matric" ? (
        <form onSubmit={requestCode} className="space-y-5">
          <div>
            <label
              htmlFor="matric-number"
              className="mb-2 block text-sm font-medium text-[#294946]"
            >
              Matric number
            </label>
            <input
              id="matric-number"
              name="matricNumber"
              type="text"
              autoComplete="username"
              value={matricNumber}
              onChange={(event) => {
                setMatricNumber(event.target.value.replaceAll(" ", ""));
                setMessage(undefined);
              }}
              placeholder="e.g. 2023/243674"
              pattern="[0-9]{4}/[0-9]{6}"
              required
              className="h-13 w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-sm text-[#17312f] outline-none transition placeholder:text-[#91a6a0] focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]"
            />
            <p className="mt-2 text-xs leading-5 text-[#708a84]">
              Enter it exactly as it appears on your student record.
            </p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#0e5a4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0a493f] focus:outline-none focus:ring-4 focus:ring-[#b8ded1] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending code..." : "Send verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-5">
          <div>
            <label
              htmlFor="otp-code"
              className="mb-2 block text-sm font-medium text-[#294946]"
            >
              Six-digit verification code
            </label>
            <input
              id="otp-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replaceAll(/\D/g, "").slice(0, 6));
                setMessage(undefined);
              }}
              placeholder="000000"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              className="h-13 w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-center font-mono text-lg tracking-[0.35em] text-[#17312f] outline-none transition placeholder:tracking-[0.35em] placeholder:text-[#91a6a0] focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]"
            />
            <p className="mt-2 text-xs leading-5 text-[#708a84]">
              The code expires in 10 minutes and can be used once.
            </p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#0e5a4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0a493f] focus:outline-none focus:ring-4 focus:ring-[#b8ded1] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Verifying..." : "Verify and continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("matric");
              setCode("");
              setMessage(undefined);
            }}
            className="w-full text-sm font-medium text-[#315954] underline-offset-4 hover:text-[#0e5a4f] hover:underline"
          >
            Use a different matric number
          </button>
        </form>
      )}

      {message && (
        <p
          className="mt-5 rounded-xl bg-[#edf8f3] px-3 py-2.5 text-sm leading-5 text-[#176353]"
          role="status"
        >
          {message}
        </p>
      )}

      <div className="mt-7 border-t border-[#e4ece8] pt-5">
        <p className="text-xs leading-5 text-[#708a84]">
          We use your registered school email only to verify eligibility. We do
          not store your identity with your ballot choices.
        </p>
      </div>
    </section>
  );
}
