import ModulePlaceholder from "@/components/ModulePlaceholder";

export default function CrmPage() {
  return (
    <ModulePlaceholder
      icon="users"
      title="CRM"
      subtitle="Clients, contacts and your deal pipeline."
      planned={[
        "Client & contact directory",
        "Deal pipeline (lead → won / lost)",
        "Notes & activity history per client",
        "Follow-up reminders",
      ]}
    />
  );
}
