"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { daysBetween } from "@/lib/ops";
import type { Project, Task, Section } from "@/lib/types";

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function Portfolio() {
  if (!isSupabaseConfigured())
    return <div className="card"><div className="empty"><h4>Connect Supabase</h4><p className="muted">Projects live in your cloud database.</p></div></div>;
  return <PortfolioInner />;
}

function PortfolioInner() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p, error: pe }, { data: t }, { data: s }] = await Promise.all([
        supabase.from("projects").select("*").order("created_at"),
        supabase.from("tasks").select("id,project_id,state,start_date,end_date,section_id"),
        supabase.from("sections").select("id,project_id"),
      ]);
      if (pe) { setError(true); setLoading(false); return; }
      setProjects((p ?? []) as Project[]);
      setTasks((t ?? []) as Task[]);
      setSections((s ?? []) as Section[]);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="card"><div className="empty"><p className="muted">Loading…</p></div></div>;
  if (error || projects.length === 0)
    return (
      <div className="card"><div className="empty">
        <h4>No projects yet</h4>
        <p className="muted">Create one on the Operations board and it’ll show up here with live metrics.</p>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => router.push("/operations")}>Go to Operations</button>
      </div></div>
    );

  return (
    <div className="port-grid">
      {projects.map((p) => {
        const pt = tasks.filter((t) => t.project_id === p.id);
        const total = pt.length;
        const done = pt.filter((t) => t.state === "done").length;
        const inProg = pt.filter((t) => t.state === "in_progress").length;
        const secCount = sections.filter((s) => s.project_id === p.id).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const est = pt.reduce((a, t) => a + (daysBetween(t.start_date, t.end_date) ?? 0), 0);
        const upcoming = pt
          .filter((t) => t.state !== "done" && t.end_date && t.end_date >= todayStr())
          .map((t) => t.end_date!)
          .sort()[0];

        return (
          <div key={p.id} className="port-card" onClick={() => router.push(`/operations?project=${p.id}`)}>
            <div className="port-head">
              <div className="ring" style={{ background: `conic-gradient(var(--ink) ${pct}%, var(--surface-2) 0)` }}>
                <b>{pct}%</b>
              </div>
              <h3>{p.name}</h3>
            </div>
            <div className="progress-line"><div className="fill" style={{ width: `${pct}%` }} /></div>
            <div className="port-stats">
              <div className="port-stat"><b>{total}</b><span>Tasks</span></div>
              <div className="port-stat"><b>{done}</b><span>Done</span></div>
              <div className="port-stat"><b>{inProg}</b><span>In progress</span></div>
              <div className="port-stat"><b>{secCount}</b><span>Sections</span></div>
            </div>
            <div className="port-stats" style={{ marginTop: 12 }}>
              <div className="port-stat"><b>{est ? est.toFixed(1) : "—"}</b><span>Est. days</span></div>
              <div className="port-stat"><b>{upcoming ? fmtDate(upcoming) : "—"}</b><span>Next due</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
