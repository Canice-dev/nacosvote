"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type AdminResetPasswordFormProps = { token: string };
const INVALID_RESET_MESSAGE =
  "This password reset link is invalid or expired. Request a new link and try again.";

export function AdminResetPasswordForm({ token }: AdminResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | undefined>(() =>
    token ? undefined : INVALID_RESET_MESSAGE,
  );
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage(INVALID_RESET_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/admin/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result: { message?: string } = await response.json();
      setMessage(result.message ?? "Unable to reset your password. Please try again.");
      setIsComplete(response.ok);
    } catch {
      setMessage("Unable to reach the password reset service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isComplete ? (
        <Link
          href="/admin/login"
          className="flex h-13 w-full items-center justify-center rounded-xl bg-[#0e5a4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0a493f]"
        >
          Continue to sign in
        </Link>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="new-admin-password"
              className="mb-2 block text-sm font-medium text-[#294946]"
            >
              New password
            </label>
            <input
              id="new-admin-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
              maxLength={200}
              className="h-13 w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-sm text-[#17312f] outline-none transition focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]"
            />
            <p className="mt-2 text-xs leading-5 text-[#708a84]">
              Use 12 to 200 characters.
            </p>
          </div>
          <div>
            <label
              htmlFor="confirm-admin-password"
              className="mb-2 block text-sm font-medium text-[#294946]"
            >
              Confirm new password
            </label>
            <input
              id="confirm-admin-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={12}
              maxLength={200}
              className="h-13 w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-sm text-[#17312f] outline-none transition focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#0e5a4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0a493f] focus:outline-none focus:ring-4 focus:ring-[#b8ded1] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Resetting password..." : "Reset password"}
          </button>
        </form>
      )}
      {message && (
        <p
          className={`mt-5 rounded-xl px-3 py-2.5 text-sm leading-5 ${
            isComplete
              ? "bg-[#edf8f3] text-[#176353]"
              : "bg-[#fff1ee] text-[#984431]"
          }`}
          role={isComplete ? "status" : "alert"}
        >
          {message}
        </p>
      )}
      {!isComplete && (
        <Link
          href="/admin/login"
          className="mt-6 inline-block text-sm font-medium text-[#315954] underline-offset-4 hover:text-[#0e5a4f] hover:underline"
        >
          Back to admin sign in
        </Link>
      )}
    </>
  );
}
