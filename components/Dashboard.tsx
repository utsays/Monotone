"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { STATE_LABEL } from "@/lib/ops";
import type { Project, Task, Member } from "@/lib/types";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

// Local sample data so the dashboard is browsable (and visually verifiable) in preview mode.
function pvIso(offset: number) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }
const PV_PROJECTS: Project[] = [
  { id: "p1", name: "Agency Launch", color: "#5c7a17", created_at: "" },
  { id: "p2", name: "Client Site Redesign", color: "#445468", created_at: "" },
  { id: "p3", name: "Newsletter Revamp", color: null, created_at: "" },
];
const pvT = (p: Partial<Task>): Task => ({ id: "", project_id: "p1", section_id: null, title: "", description: null, state: "not_started", labels: [], assignee_id: null, start_date: null, end_date: null, position: 0, created_at: "", ...p });
const PV_TASKS: Task[] = [
  pvT({ id: "t1", title: "Define brand positioning & tone", state: "done", assignee_id: "m1", end_date: pvIso(-6) }),
  pvT({ id: "t2", title: "Homepage wireframe", state: "in_progress", assignee_id: "m1", end_date: pvIso(-1) }),
  pvT({ id: "t3", title: "Write hero + services copy", state: "in_progress", assignee_id: "m2", end_date: pvIso(2) }),
  pvT({ id: "t4", title: "Collect competitor references", state: "not_started", assignee_id: "m2", end_date: pvIso(2) }),
  pvT({ id: "t5", title: "Finalize colour system", state: "done", assignee_id: "m1", end_date: pvIso(-3) }),
  pvT({ id: "t6", project_id: "p2", title: "Migrate content to new CMS", state: "done", assignee_id: "m2", end_date: pvIso(-9) }),
  pvT({ id: "t7", project_id: "p2", title: "QA on staging", state: "done", assignee_id: "m1", end_date: pvIso(-4) }),
];
const PV_MEMBERS: Member[] = [
  { id: "m1", project_id: null, name: "Uzair Tariq", email: null, avatar_url: null, avatar_color: "#121210", user_id: null, active: true, role: null, created_at: "" },
  { id: "m2", project_id: null, name: "Sara Malik", email: null, avatar_url: null, avatar_color: "#445468", user_id: null, active: true, role: null, created_at: "" },
];

export default function Dashboard() {
  if (!isSupabaseConfigured()) return <DashboardInner preview />;
  return <DashboardInner />;
}

function DashHead() {
  return (
    <div className="dash-head">
      <div>
        <h1>Dashboard</h1>
        <p>Plan, prioritize, and accomplish your tasks with ease.</p>
      </div>
    </div>
  );
}

function DashboardInner({ preview = false }: { preview?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(preview ? PV_PROJECTS : []);
  const [tasks, setTasks] = useState<Task[]>(preview ? PV_TASKS : []);
  const [members, setMembers] = useState<Member[]>(preview ? PV_MEMBERS : []);
  const [loading, setLoading] = useState(!preview);
  const [setup, setSetup] = useState(false);

  useEffect(() => {
    if (preview) return;
    let alive = true;
    async function load() {
      const [p, t, m] = await Promise.all([
        supabase.from("projects").select("id,name,created_at").order("created_at"),
        supabase.from("tasks").select("id,project_id,state,start_date,end_date,assignee_id,title"),
        supabase.from("members").select("id,name,avatar_url,avatar_color,active").order("name"),
      ]);
      if (!alive) return;
      if ((p.error && /does not exist/i.test(p.error.message)) || (m.error && /does not exist/i.test(m.error.message))) { setSetup(true); setLoading(false); return; }
      setProjects((p.data ?? []) as Project[]);
      setTasks((t.data ?? []) as Task[]);
      setMembers((m.data ?? []) as Member[]);
      setLoading(false);
    }
    load();
    const ch = supabase.channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [supabase, preview]);

  const d = useMemo(() => {
    const byProject = (pid: string) => tasks.filter((t) => t.project_id === pid);
    const total = projects.length;
    let ended = 0, running = 0, pending = 0;
    projects.forEach((p) => {
      const ts = byProject(p.id);
      if (ts.length === 0) pending++;
      else if (ts.every((t) => t.state === "done")) ended++;
      else running++;
    });
    const allDone = tasks.filter((t) => t.state === "done").length;
    const allProg = tasks.filter((t) => t.state === "in_progress").length;
    const pct = tasks.length ? Math.round((allDone / tasks.length) * 100) : 0;

    // weekday distribution of dated tasks
    const counts = [0, 0, 0, 0, 0, 0, 0];
    tasks.forEach((t) => { if (t.end_date) counts[new Date(t.end_date + "T00:00:00").getDay()]++; });
    const maxDay = Math.max(...counts);
    const peakIdx = counts.indexOf(maxDay);

    const today = todayStr();
    const upcoming = tasks
      .filter((t) => t.state !== "done" && t.end_date && t.end_date >= today)
      .sort((a, b) => (a.end_date! < b.end_date! ? -1 : 1));
    const nextTask = upcoming[0] ?? null;

    return { total, ended, running, pending, allDone, allProg, allPending: tasks.length - allDone - allProg, pct, counts, maxDay, peakIdx, nextTask, taskCount: tasks.length };
  }, [projects, tasks]);

  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? "";
  const taskFor = (memberId: string) => {
    const mine = tasks.filter((t) => t.assignee_id === memberId);
    return mine.find((t) => t.state === "in_progress") ?? mine.find((t) => t.state !== "done") ?? mine[0] ?? null;
  };
  const badgeFor = (state?: string) => state === "done" ? { c: "completed", t: "Completed" } : state === "in_progress" ? { c: "progress", t: "In Progress" } : { c: "pending", t: "Pending" };

  if (setup) return (<><DashHead /><div className="card"><div className="empty"><h4>Finish database setup</h4><p className="muted">Run supabase/setup-all.sql, then your dashboard fills in.</p><button className="btn" style={{ marginTop: 14 }} onClick={() => router.push("/operations")}>Go to Tasks</button></div></div></>);
  if (loading) return (<><DashHead /><div className="card"><div className="empty"><p className="muted">Loading your data…</p></div></div></>);

  const STATS = [
    { lbl: "Total Projects", val: d.total, note: `${members.filter((m) => m.active !== false).length} team members`, featured: true, href: "/projects" },
    { lbl: "Ended Projects", val: d.ended, note: d.total ? `${Math.round((d.ended / d.total) * 100)}% of all projects` : "none yet", href: "/projects" },
    { lbl: "Running Projects", val: d.running, note: `${d.allProg} tasks in progress`, href: "/projects" },
    { lbl: "Pending Projects", val: d.pending, note: "no tasks yet", href: "/projects" },
  ];

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p>Plan, prioritize, and accomplish your tasks with ease.</p>
        </div>
        <div className="dash-head-actions">
          <button className="btn" onClick={() => router.push("/operations")}><Icon name="plus" size={17} strokeWidth={2.4} /> New task</button>
          <button className="btn-ghost" onClick={() => router.push("/team")}><Icon name="users" size={16} /> Team</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dstat-row">
        {STATS.map((s) => (
          <div key={s.lbl} className={`dstat${s.featured ? " featured" : ""}`} style={{ cursor: "pointer" }} onClick={() => router.push(s.href)}>
            <div className="dstat-top">
              <span className="dstat-lbl">{s.lbl}</span>
              <span className="arrow-circle"><Icon name="arrowUpRight" size={16} strokeWidth={2.2} /></span>
            </div>
            <div className="dstat-num">{s.val}</div>
            <div className="dstat-delta"><span>{s.note}</span></div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="dash-row">
        <div className="panel">
          <div className="panel-head"><h3>Tasks by Day</h3></div>
          {d.taskCount === 0 ? (
            <div className="empty" style={{ flex: 1 }}><p className="muted">No dated tasks yet. Add tasks with due dates to see your workload.</p></div>
          ) : (
            <div className="bars">
              {d.counts.map((c, i) => (
                <div className="bar-wrap" key={i}>
                  <div className="bar-track">
                    {i === d.peakIdx && d.maxDay > 0 && <span className="bar-tip">{c}</span>}
                    <div className={`bar${c === 0 ? " hatch" : ""}${i === d.peakIdx && d.maxDay > 0 ? " peak" : ""}`} style={{ height: `${d.maxDay ? (c / d.maxDay) * 100 : 0}%` }} />
                  </div>
                  <span className="bar-day">{DOW[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Up Next</h3></div>
          {d.nextTask ? (
            <>
              <div className="reminder-title">{d.nextTask.title}</div>
              <div className="reminder-time">{projName(d.nextTask.project_id)} · due {fmtDate(d.nextTask.end_date!)}</div>
              <button className="btn btn-block" style={{ marginTop: 18 }} onClick={() => router.push(`/operations?project=${d.nextTask!.project_id}&task=${d.nextTask!.id}`)}>Open task</button>
            </>
          ) : (
            <div className="empty" style={{ flex: 1 }}><p className="muted">Nothing due. You’re all caught up. 🎉</p></div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Projects</h3><button className="chip-btn" onClick={() => router.push("/operations")}><Icon name="plus" size={13} strokeWidth={2.6} /> New</button></div>
          {projects.length === 0 ? (
            <div className="empty" style={{ flex: 1 }}><p className="muted">No projects yet.</p></div>
          ) : projects.slice(0, 5).map((p) => {
            const ts = tasks.filter((t) => t.project_id === p.id);
            const due = ts.filter((t) => t.state !== "done" && t.end_date && t.end_date >= todayStr()).map((t) => t.end_date!).sort()[0];
            return (
              <div className="pl-row" key={p.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/operations?project=${p.id}`)}>
                <span className="pl-ic"><Icon name="box" size={15} /></span>
                <div><b>{p.name}</b><span>{ts.length} task{ts.length !== 1 ? "s" : ""}{due ? ` · next ${fmtDate(due)}` : ""}</span></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2 */}
      <div className="dash-row">
        <div className="panel">
          <div className="panel-head"><h3>Team Collaboration</h3><button className="chip-btn" onClick={() => router.push("/team")}><Icon name="plus" size={13} strokeWidth={2.6} /> Add Member</button></div>
          {members.filter((m) => m.active !== false).length === 0 ? (
            <div className="empty" style={{ flex: 1 }}><p className="muted">No members yet. Add your team.</p></div>
          ) : members.filter((m) => m.active !== false).slice(0, 5).map((m) => {
            const t = taskFor(m.id);
            const b = badgeFor(t?.state);
            return (
              <div className="tc-row" key={m.id}>
                <Avatar name={m.name} url={m.avatar_url} color={m.avatar_color} size={38} />
                <div className="tc-info"><b>{m.name}</b><span>{t ? <>Working on <b>{t.title}</b></> : "No active task"}</span></div>
                {t && <span className={`tc-badge ${b.c}`}>{b.t}</span>}
              </div>
            );
          })}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Overall Progress</h3></div>
          <Gauge pct={d.pct} />
          <div className="gauge-legend">
            <span><i className="gl solid" /> Completed {d.allDone}</span>
            <span><i className="gl deep" /> In Progress {d.allProg}</span>
            <span><i className="gl hatch" /> Pending {d.allPending}</span>
          </div>
        </div>

        <div className="panel time-tracker">
          <h3>Time Tracker</h3>
          <Stopwatch />
        </div>
      </div>
    </>
  );
}

function Gauge({ pct }: { pct: number }) {
  const L = Math.PI * 80;
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 118" className="chart-svg">
        <path d="M20 108 A80 80 0 0 1 180 108" fill="none" stroke="var(--series-2)" strokeWidth="18" strokeLinecap="round" strokeDasharray="4 9" />
        <path d="M20 108 A80 80 0 0 1 180 108" fill="none" stroke="url(#og)" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${(pct / 100) * L} ${L}`} />
        <defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--ink-2)" /><stop offset="1" stopColor="var(--ink)" /></linearGradient></defs>
        <text x="100" y="96" textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--ink)">{pct}%</text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink-soft)">Completed</text>
      </svg>
    </div>
  );
}

function Stopwatch() {
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) ref.current = setInterval(() => setSec((s) => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <>
      <div className="tt-time">{hh}:{mm}:{ss}</div>
      <div className="tt-controls">
        <button className="tt-btn" onClick={() => setRunning((r) => !r)} title={running ? "Pause" : "Start"}>
          <Icon name={running ? "pause" : "play"} size={18} />
        </button>
        <button className="tt-btn stop" onClick={() => { setRunning(false); setSec(0); }} title="Reset"><Icon name="stop" size={16} /></button>
      </div>
    </>
  );
}
