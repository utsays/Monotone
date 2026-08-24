import ModulePlaceholder from "@/components/ModulePlaceholder";

export default function StrategyPage() {
  return (
    <ModulePlaceholder
      icon="target"
      title="Strategy"
      subtitle="Goals, OKRs and the big-picture plan."
      planned={[
        "Company goals & OKRs",
        "Quarterly roadmap",
        "Key metrics dashboard",
        "Decision & meeting log",
      ]}
    />
  );
}
