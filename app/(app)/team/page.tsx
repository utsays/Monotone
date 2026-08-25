import TeamManager from "@/components/operations/TeamManager";

export default function TeamPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p>Everyone who works in Monotone — add people and they’re instantly available as assignees.</p>
        </div>
      </div>
      <TeamManager />
    </>
  );
}
