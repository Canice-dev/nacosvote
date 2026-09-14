import { AdminSectionPage } from "@/components/admin-section-page";

export default function AuditLogPage() {
  return (
    <AdminSectionPage
      eyebrow="Audit log"
      title="Audit log"
      description="Review administrative activity across the election."
      action="Export log"
      emptyMessage="No audit activity has been recorded."
    />
  );
}
