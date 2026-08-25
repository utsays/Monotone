import SettingsView from "@/components/operations/SettingsView";

export default function SettingsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Your profile, password, security, and account.</p>
        </div>
      </div>
      <SettingsView />
    </>
  );
}
