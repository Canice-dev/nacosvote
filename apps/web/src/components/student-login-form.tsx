"use client";

import { FormEvent, useState } from "react";

export function StudentLoginForm() {
  const [matricNumber, setMatricNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="w-full max-w-md justify-self-end rounded-3xl border border-[#d9e5df] bg-white p-6 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-[#176353]">Student sign in</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17312f]">Let&apos;s verify you</h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf8f3] text-[#176353]" aria-hidden="true">→</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="matric-number" className="mb-2 block text-sm font-medium text-[#294946]">Matric number</label>
          <input
            id="matric-number"
            name="matricNumber"
            type="text"
            autoComplete="username"
            value={matricNumber}
            onChange={(event) => {
              setMatricNumber(event.target.value.toUpperCase());
              setSubmitted(false);
            }}
            placeholder="e.g. CSC/2022/1234"
            required
            className="h-[3.25rem] w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-sm text-[#17312f] outline-none transition placeholder:text-[#91a6a0] focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]"
          />
          <p className="mt-2 text-xs leading-5 text-[#708a84]">Enter it exactly as it appears on your student record.</p>
        </div>

        <button type="submit" className="flex h-[3.25rem] w-full items-center justify-center rounded-xl bg-[#0e5a4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0a493f] focus:outline-none focus:ring-4 focus:ring-[#b8ded1]">
          Send verification code
        </button>

        {submitted && (
          <p className="rounded-xl bg-[#edf8f3] px-3 py-2.5 text-sm leading-5 text-[#176353]" role="status">
            The OTP service will be connected next. No code has been sent yet.
          </p>
        )}
      </form>

      <div className="mt-7 border-t border-[#e4ece8] pt-5">
        <p className="text-xs leading-5 text-[#708a84]">We use your registered school email only to verify eligibility. We do not store your identity with your ballot choices.</p>
      </div>
    </section>
  );
}
