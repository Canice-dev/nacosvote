import { AdminSectionPage } from "@/components/admin-section-page";

export default function AccountsPage() {
  return (
    <AdminSectionPage
      eyebrow="Admin accounts"
      title="Administrator accounts"
      description="Manage access for election administrators and observers."
      action="Add administrator"
      emptyMessage="No additional administrator accounts exist."
    />
  );
}
