import Link from "next/link";

import { StudentLoginForm } from "@/components/student-login-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="NACOS Vote home">
            <span className="grid size-10 place-items-center rounded-xl bg-[#0e5a4f] text-sm font-bold tracking-tight text-white">NV</span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">NACOS Vote</span>
          </Link>
          <Link href="/admin/login" className="text-sm font-medium text-[#315954] underline-offset-4 hover:text-[#0e5a4f] hover:underline">
            Admin sign in
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-20 lg:py-16">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex rounded-full border border-[#b9d6cc] bg-[#edf8f3] px-3 py-1 text-xs font-semibold tracking-wide text-[#176353]">
              DEPARTMENTAL ELECTION PORTAL
            </p>
            <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#17312f] sm:text-5xl lg:text-6xl">
              Your voice belongs in this election.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#52706b] sm:text-lg">
              Sign in securely with your matric number to receive a one-time verification code at your registered school email.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["01", "Verify", "Use your matric number"],
                ["02", "Vote", "Review every selection"],
                ["03", "Confirm", "Receive your receipt"],
              ].map(([number, title, description]) => (
                <div key={number} className="border-l border-[#cfe0d9] pl-3">
                  <p className="text-xs font-bold tracking-widest text-[#2f8572]">{number}</p>
                  <p className="mt-2 text-sm font-semibold text-[#244440]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#66817b]">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <StudentLoginForm />
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#d9e5df] pt-5 text-xs text-[#66817b] sm:flex-row sm:items-center sm:justify-between">
          <p>Your ballot is private. Your vote cannot be linked to your identity.</p>
          <a href="mailto:elections@nacos.edu.ng" className="font-medium text-[#315954] hover:text-[#0e5a4f] hover:underline">
            Need help? Contact election support
          </a>
        </footer>
      </div>
    </main>
  );
}
