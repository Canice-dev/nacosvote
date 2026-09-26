import { SiteHeader } from "@/components/site-header";
import { StudentBallot } from "@/components/student-ballot";

export const metadata = {
  title: "Your Ballot | NACOS Vote",
};

export default function BallotPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <SiteHeader />

        <section className="flex flex-1 items-center justify-center py-10 sm:py-12">
          <StudentBallot />
        </section>

        <footer className="pt-5 text-xs text-[#66817b]">
          Your ballot is private. Your vote cannot be linked to your identity.
        </footer>
      </div>
    </main>
  );
}
