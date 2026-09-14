export const metadata = { title: "Admin dashboard | NACOS Vote" };

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-12 text-[#1b2b2a] sm:px-8">
      <section className="mx-auto max-w-5xl rounded-3xl border border-[#d9e5df] bg-white p-8 shadow-[0_24px_60px_-35px_rgba(20,73,62,0.45)] sm:p-12">
        <p className="text-sm font-semibold text-[#176353]">NACOS Vote</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#17312f]">Admin dashboard</h1>
        <p className="mt-4 text-[#52706b]">You are signed in. Election controls will be added here next.</p>
      </section>
    </main>
  );
}
