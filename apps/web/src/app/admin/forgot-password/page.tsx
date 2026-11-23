import Link from "next/link";

import { AdminForgotPasswordForm } from "@/components/admin-forgot-password-form";

export const metadata = { title: "Forgot admin password | NACOS Vote" };

export default function AdminForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex h-18.25 items-center">
          <Link
            href="/admin/login"
            className="text-sm font-medium text-[#315954] underline-offset-4 hover:text-[#0e5a4f] hover:underline"
          >
            Admin sign in
          </Link>
        </header>
        <section className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
          <div className="w-full rounded-3xl border border-[#d9e5df] bg-white p-7 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-9">
            <p className="text-sm font-semibold text-[#176353]">
              Account recovery
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#17312f]">
              Forgot your password?
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#66817b]">
              Enter the email address on your administrator account. If it is
              active, we’ll send a one-time reset link.
            </p>
            <div className="mt-8">
              <AdminForgotPasswordForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
