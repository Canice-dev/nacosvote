import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Your Ballot | NACOS Vote",
};

export default function BallotPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-6 text-[#1b2b2a] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col">
        <SiteHeader />

        <section className="flex flex-1 items-center justify-center py-12">
          <div className="w-full rounded-3xl border border-[#d9e5df] bg-white p-7 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-10">
            <p className="text-sm font-semibold text-[#176353]">Verification complete</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#17312f] sm:text-4xl">
              Your ballot will appear here.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#52706b]">
              You will select one candidate for each position, review every choice, and submit one final anonymous ballot.
            </p>

            <div className="mt-8 rounded-2xl bg-[#edf8f3] p-5 text-sm leading-6 text-[#315954]">
              The ballot page is ready for the election and candidate API. We will connect the verified voter session here when OTP verification is added.
            </div>
          </div>
        </section>

        <footer className="border-t border-[#d9e5df] pt-5 text-xs text-[#66817b]">
          Your ballot is private. Your vote cannot be linked to your identity.
        </footer>
      </div>
    </main>
  );
}
