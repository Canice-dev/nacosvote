import { AdminSectionPage } from "@/components/admin-section-page";

export default function ResultsPage() {
  return (
    <AdminSectionPage
      eyebrow="Results"
      title="Election results"
      description="Review and publish results after the election is closed."
      action="View results"
      emptyMessage="Results will appear when voting has concluded."
    />
  );
}
