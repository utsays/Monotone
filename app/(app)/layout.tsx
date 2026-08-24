import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Topbar email={user.email} preview={user.preview} />
        {user.preview && (
          <div className="banner">
            <span className="tag">PREVIEW MODE</span>
            You’re viewing locally. Connect Supabase to turn on real team logins
            and live shared data.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
