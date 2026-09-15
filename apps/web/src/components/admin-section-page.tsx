import { AdminSidebar } from "@/components/admin-sidebar";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin-session";

type AdminSectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  emptyMessage: string;
};

export async function AdminSectionPage({
  eyebrow,
  title,
  description,
  action,
  emptyMessage,
}: AdminSectionPageProps) {
  const admin = await requireAdmin();
  const initials = admin.username.slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
      <AdminSidebar {...admin} initials={initials} />
      <div className="lg:pl-67">
        <SiteHeader className="h-18.25 border-b border-[#e6e6e3] bg-white px-5 pl-17 sm:px-8 lg:px-12" />
        <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 border-b border-[#e5e6e2] pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#707773]">{eyebrow}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">
                {description}
              </p>
            </div>
            <button className="w-fit rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b493f]">
              {action}
            </button>
          </div>
          <div className="mt-7 border border-dashed border-[#cfdad5] bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-[#39413e]">
              {emptyMessage}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#747c78]">
              This section is ready for its management tools and election data.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
