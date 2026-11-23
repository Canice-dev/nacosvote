"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const GENERIC_MESSAGE =
  "If an active admin account uses that email, a password reset link will be sent.";

export function AdminForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/admin/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result: { message?: string } = await response.json();
      setMessage(result.message ?? GENERIC_MESSAGE);
    } catch {
      setMessage(GENERIC_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="admin-reset-email"
            className="mb-2 block text-sm font-medium text-[#294946]"
          >
            Admin account email
          </label>
          <input
            id="admin-reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            className="h-13 w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-sm text-[#17312f] outline-none transition focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-13 w-full items-center justify-center rounded-xl bg-[#0e5a4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0a493f] focus:outline-none focus:ring-4 focus:ring-[#b8ded1] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
      {message && (
        <p
          className="mt-5 rounded-xl bg-[#edf8f3] px-3 py-2.5 text-sm leading-5 text-[#176353]"
          role="status"
        >
          {message}
        </p>
      )}
      <Link
        href="/admin/login"
        className="mt-6 inline-block text-sm font-medium text-[#315954] underline-offset-4 hover:text-[#0e5a4f] hover:underline"
      >
        Back to admin sign in
      </Link>
    </>
  );
}
