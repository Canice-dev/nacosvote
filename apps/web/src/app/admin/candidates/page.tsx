import { AdminSectionPage } from "@/components/admin-section-page";

export default function CandidatesPage() {
  return (
    <AdminSectionPage
      eyebrow="Positions & candidates"
      title="Positions and candidates"
      description="Set up elective positions and manage candidate nominations."
      action="Add position"
      emptyMessage="No positions or candidates have been added."
    />
  );
}
