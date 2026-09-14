"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const result: { message?: string; nextPath?: string } = await response.json();

      if (!response.ok || !result.nextPath) {
        setMessage(result.message ?? "Unable to sign in.");
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="admin-identifier" className="mb-2 block text-sm font-medium text-[#294946]">Username or email</label>
        <input id="admin-identifier" type="text" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required className="h-[3.25rem] w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-sm text-[#17312f] outline-none transition focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]" />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-[#294946]">Password</label>
        <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-[3.25rem] w-full rounded-xl border border-[#c9d9d2] bg-[#fbfdfc] px-4 text-sm text-[#17312f] outline-none transition focus:border-[#16806b] focus:ring-4 focus:ring-[#dff3eb]" />
      </div>
      <button type="submit" disabled={isSubmitting} className="flex h-[3.25rem] w-full items-center justify-center rounded-xl bg-[#0e5a4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0a493f] focus:outline-none focus:ring-4 focus:ring-[#b8ded1] disabled:cursor-not-allowed disabled:opacity-70">
        {isSubmitting ? "Signing in..." : "Sign in to dashboard"}
      </button>
      {message && <p className="rounded-xl bg-[#fff1ee] px-3 py-2.5 text-sm leading-5 text-[#984431]" role="alert">{message}</p>}
    </form>
  );
}
