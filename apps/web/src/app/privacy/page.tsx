import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy Notice | NACOS Vote",
  description: "How NACOS Vote uses and protects student information.",
};

const sectionClass = "mt-8";
const headingClass = "text-lg font-semibold text-[#17312f]";
const paragraphClass = "mt-3 text-sm leading-7 text-[#52706b]";

export default function PrivacyNoticePage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col">
        <SiteHeader />

        <article className="my-10 rounded-3xl border border-[#d9e5df] bg-white px-6 py-8 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.25)] sm:my-14 sm:px-10 sm:py-12">
          <p className="text-sm font-semibold text-[#2f8572]">Student voting</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#17312f] sm:text-4xl">
            Privacy Notice
          </h1>
          <p className={paragraphClass}>
            This notice explains what information NACOS Vote uses during the
            election, why it is needed, and how your ballot is protected.
          </p>

          <section className={sectionClass}>
            <h2 className={headingClass}>Information we use</h2>
            <p className={paragraphClass}>
              The voter register contains your matric number, name, school
              email, and level. We use these details to check that you are
              eligible to vote and to send a one-time verification code to your
              registered school email. We also keep the verification and sign-in
              security records needed to protect access to the election.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>Your ballot is private</h2>
            <p className={paragraphClass}>
              Your eligibility and whether you have voted are kept separately
              from your ballot choices. Your name, matric number, and email are
              not stored with the candidates you select. Administrators can
              manage the voter register and see voting status, but results show
              vote totals rather than a voter-by-voter list of choices.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>How long information is kept</h2>
            <p className={paragraphClass}>
              Eligibility, verification, and security records are kept for up
              to one year for election administration and security. Anonymous
              aggregate results may be kept for election records and reporting.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>Questions or support</h2>
            <p className={paragraphClass}>
              If you have questions about your information or need help with
              sign-in, contact election support at{" "}
              <a
                href="mailto:elections@nacos.edu.ng"
                className="font-semibold text-[#176353] underline underline-offset-2 hover:text-[#0e5a4f]"
              >
                elections@nacos.edu.ng
              </a>
              .
            </p>
          </section>

          <div className="mt-10 border-t border-[#e4ece8] pt-6">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0e5a4f] px-5 text-sm font-semibold text-white transition hover:bg-[#0a493f] focus:outline-none focus:ring-4 focus:ring-[#b8ded1]"
            >
              Return to student sign in
            </Link>
          </div>
        </article>

        <footer className="mt-auto border-t border-[#d9e5df] pt-5 text-xs text-[#66817b]">
          Your ballot is private. Your vote cannot be linked to your identity.
        </footer>
      </div>
    </main>
  );
}
