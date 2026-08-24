import CalendarView from "@/components/operations/CalendarView";

export default function CalendarPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>All your tasks by date — synced live with every project.</p>
        </div>
      </div>
      <CalendarView />
    </>
  );
}
