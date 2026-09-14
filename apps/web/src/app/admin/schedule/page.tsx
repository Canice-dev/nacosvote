import { AdminSectionPage } from "@/components/admin-section-page";

export default function SchedulePage() {
  return (
    <AdminSectionPage
      eyebrow="Schedule & controls"
      title="Schedule and controls"
      description="Set voting dates and manage the election lifecycle."
      action="Edit schedule"
      emptyMessage="No election schedule has been configured."
    />
  );
}
