import { AdminSectionPage } from "@/components/admin-section-page";

export default function VoterRegisterPage() {
  return (
    <AdminSectionPage
      eyebrow="Voter register"
      title="Eligible voters"
      description="Import, review, and manage students who can vote."
      action="Import voters"
      emptyMessage="No voter register has been imported."
    />
  );
}
