import { AdminSectionPage } from "@/components/admin-section-page";

export default function ElectionSetupPage() {
  return (
    <AdminSectionPage
      eyebrow="Election setup"
      title="Election setup"
      description="Create and configure the departmental election."
      action="Create election"
      emptyMessage="No election configuration yet."
    />
  );
}
