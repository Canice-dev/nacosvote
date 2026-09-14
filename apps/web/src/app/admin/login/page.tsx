import Link from "next/link";

import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Admin sign in | NACOS Vote" };

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="NACOS Vote home">
            <span className="grid size-10 place-items-center rounded-xl bg-[#0e5a4f] text-sm font-bold tracking-tight text-white">NV</span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">NACOS Vote</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-[#315954] hover:text-[#0e5a4f] hover:underline">Student portal</Link>
        </header>
        <section className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
          <div className="w-full rounded-3xl border border-[#d9e5df] bg-white p-7 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-9">
            <p className="text-sm font-semibold text-[#176353]">Election administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#17312f]">Admin sign in</h1>
            <p className="mt-3 text-sm leading-6 text-[#66817b]">Use your assigned administrator account to manage this election.</p>
            <div className="mt-8"><AdminLoginForm /></div>
          </div>
        </section>
      </div>
    </main>
  );
}
