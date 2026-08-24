import ModulePlaceholder from "@/components/ModulePlaceholder";

export default function FinancePage() {
  return (
    <ModulePlaceholder
      icon="wallet"
      title="Finance"
      subtitle="Revenue, expenses and invoices in one place."
      planned={[
        "Revenue & expense tracking",
        "Profit / margin KPIs and charts",
        "Invoice list with paid / overdue status",
        "Monthly financial summary",
      ]}
    />
  );
}
