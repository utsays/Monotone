"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import { labelColor, STATE_LABEL, daysBetween } from "@/lib/ops";
import type { Project, Task, Member } from "@/lib/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const STATE_DOT: Record<string, string> = { not_started: "#c3c7cc", in_progress: "#2f7d4f", waiting: "#3f6ad6", blocked: "#e05a4d", done: "#17181c" };
const fmtLong = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function CalendarView() {
  if (!isSupabaseConfigured())
    return <div className="card"><div className="empty"><h4>Connect Supabase</h4><p className="muted">The calendar reads your tasks from the cloud database.</p></div></div>;
  return <CalendarInner />;
}

function CalendarInner() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [detail, setDetail] = useState<Task | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t, error: te }, { data: p }, { data: mem }] = await Promise.all([
        supabase.from("tasks").select("*").not("start_date", "is", null).not("end_date", "is", null),
        supabase.from("projects").select("id,name"),
        supabase.from("members").select("id,name"),
      ]);
      if (te) { setError(true); setLoading(false); return; }
      setTasks((t ?? []) as Task[]);
      setProjects((p ?? []) as Project[]);
      setMembers((mem ?? []) as Member[]);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="card"><div className="empty"><p className="muted">Loading…</p></div></div>;
  if (error)
    return <div className="card"><div className="empty"><h4>Finish Operations setup first</h4><p className="muted">Once your tasks tables exist, the calendar fills in automatically.</p><button className="btn" style={{ marginTop: 16 }} onClick={() => router.push("/operations")}>Go to Operations</button></div></div>;

  const first = new Date(cursor.y, cursor.m, 1);
  const start = new Date(cursor.y, cursor.m, 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const todayIso = iso(new Date());
  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? "";

  const go = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <>
      <div className="cal-head">
        <div className="cal-nav">
          <button className="nav-b" onClick={() => go(-1)}><Icon name="chevronLeft" size={18} /></button>
          <button className="nav-b" onClick={() => go(1)}><Icon name="chevronRight" size={18} /></button>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginLeft: 6 }}>
            {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h3>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          const ds = iso(d);
          const inMonth = d.getMonth() === cursor.m;
          const dayTasks = tasks.filter((t) => t.start_date! <= ds && t.end_date! >= ds);
          return (
            <div key={i} className={`cal-cell${inMonth ? "" : " out"}${ds === todayIso ? " today" : ""}`}>
              <div className="cal-date">{d.getDate()}</div>
              {dayTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="cal-task" title={t.title} onClick={() => setDetail(t)}>
                  <span className="cbar" style={{ background: STATE_DOT[t.state] ?? "#c3c7cc" }} />
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && <div className="cal-more">+{dayTasks.length - 3} more</div>}
            </div>
          );
        })}
      </div>

      {detail && (
        <div className="modal-bg" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h3>{detail.title}</h3><button className="x-btn" onClick={() => setDetail(null)}>✕</button></div>
            {detail.labels?.length > 0 && (
              <div className="labs" style={{ marginBottom: 14 }}>
                {detail.labels.map((l) => { const c = labelColor(l); return <span key={l} className="lab" style={{ background: c.bg, color: c.fg }}>{l}</span>; })}
              </div>
            )}
            <div className="detail-row"><span>Project</span><span>{projName(detail.project_id)}</span></div>
            <div className="detail-row"><span>State</span><span>{STATE_LABEL[detail.state]}</span></div>
            <div className="detail-row"><span>Start</span><span>{detail.start_date && fmtLong(detail.start_date)}</span></div>
            <div className="detail-row"><span>End</span><span>{detail.end_date && fmtLong(detail.end_date)}</span></div>
            {detail.assignee_id && members.find((m) => m.id === detail.assignee_id) && (
              <div className="detail-row"><span>Assignee</span><span>{members.find((m) => m.id === detail.assignee_id)!.name}</span></div>
            )}
            {daysBetween(detail.start_date, detail.end_date) != null && (
              <div className="detail-row"><span>Estimate</span><span>{daysBetween(detail.start_date, detail.end_date)} day(s)</span></div>
            )}
            <div className="modal-actions">
              <button className="btn btn-block" onClick={() => router.push(`/operations?project=${detail.project_id}`)}>Open in board</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
