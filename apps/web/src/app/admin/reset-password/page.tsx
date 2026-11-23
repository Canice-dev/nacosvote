import Link from "next/link";

import { AdminResetPasswordForm } from "@/components/admin-reset-password-form";

export const metadata = {
  title: "Reset admin password | NACOS Vote",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type AdminResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AdminResetPasswordPage({
  searchParams,
}: AdminResetPasswordPageProps) {
  const { token = "" } = await searchParams;

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
              Choose a new password
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#66817b]">
              Reset links work once and expire after 30 minutes.
            </p>
            <div className="mt-8">
              <AdminResetPasswordForm token={token} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
