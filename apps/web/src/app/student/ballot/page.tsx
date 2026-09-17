import { SiteHeader } from "@/components/site-header";
import { StudentBallot } from "@/components/student-ballot";

export const metadata = {
  title: "Your Ballot | NACOS Vote",
};

export default function BallotPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col">
        <SiteHeader />

        <section className="flex flex-1 items-center justify-center py-12">
          <div className="w-full rounded-3xl bg-white p-7 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-10">
            <StudentBallot />
          </div>
        </section>

        <footer className="pt-5 text-xs text-[#66817b]">
          Your ballot is private. Your vote cannot be linked to your identity.
        </footer>
      </div>
    </main>
  );
}
