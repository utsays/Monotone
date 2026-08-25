"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import { daysBetween, TAG_PALETTE } from "@/lib/ops";
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

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);

  const load = useMemo(() => async () => {
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
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function createProject() {
    const name = newName.trim(); if (!name) return;
    await supabase.from("projects").insert({ name });
    setNewName(""); setCreateOpen(false); await load();
  }
  function openSettings(p: Project) { setEditing(p); setEditName(p.name); setEditColor(p.color ?? null); }
  async function saveSettings() {
    if (!editing || !editName.trim()) return;
    await supabase.from("projects").update({ name: editName.trim(), color: editColor }).eq("id", editing.id);
    setEditing(null); await load();
  }
  async function deleteProject() {
    if (!editing) return;
    if (!confirm(`Delete "${editing.name}"? All its sections, tasks and tags are permanently removed. This cannot be undone.`)) return;
    await supabase.from("projects").delete().eq("id", editing.id);
    setEditing(null); await load();
  }

  if (loading) return <div className="card"><div className="empty"><p className="muted">Loading…</p></div></div>;
  if (error)
    return (
      <div className="card"><div className="empty">
        <h4>Finish Tasks setup first</h4>
        <p className="muted">Once your tasks tables exist, projects show up here with live metrics.</p>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => router.push("/operations")}>Go to Tasks</button>
      </div></div>
    );

  return (
    <>
      <div className="port-toolbar">
        <button className="btn" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> New project</button>
      </div>

      {projects.length === 0 ? (
        <div className="card"><div className="empty">
          <h4>No projects yet</h4>
          <p className="muted">Create your first project to start tracking tasks and progress.</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => setCreateOpen(true)}>+ New project</button>
        </div></div>
      ) : (
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
            const accent = p.color ?? "var(--accent)";

            return (
              <div key={p.id} className="port-card" onClick={() => router.push(`/operations?project=${p.id}`)}>
                <button className="port-cog" title="Project settings" onClick={(e) => { e.stopPropagation(); openSettings(p); }}>
                  <Icon name="settings" size={16} />
                </button>
                <div className="port-head">
                  <div className="ring" style={{ background: `conic-gradient(${accent} ${pct}%, var(--surface-2) 0)` }}>
                    <b>{pct}%</b>
                  </div>
                  <h3><span className="port-dot" style={{ background: accent }} />{p.name}</h3>
                </div>
                <div className="progress-line"><div className="fill" style={{ width: `${pct}%`, background: accent }} /></div>
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
      )}

      {createOpen && (
        <div className="modal-bg" onClick={() => setCreateOpen(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h3>New project</h3><button className="x-btn" onClick={() => setCreateOpen(false)}>✕</button></div>
            <div className="field"><label>Project name</label>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Agency Launch" onKeyDown={(e) => e.key === "Enter" && createProject()} /></div>
            <div className="modal-actions"><button className="btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn" onClick={createProject} disabled={!newName.trim()}>Create</button></div>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h3>Project settings</h3><button className="x-btn" onClick={() => setEditing(null)}>✕</button></div>
            <div className="field"><label>Project name</label>
              <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveSettings()} /></div>
            <div className="field"><label>Colour</label>
              <div className="swatches">
                <span className={`sw none${editColor ? "" : " on"}`} title="No colour" onClick={() => setEditColor(null)} />
                {TAG_PALETTE.map((col) => (
                  <span key={col} className={`sw${editColor === col ? " on" : ""}`} style={{ background: col }} onClick={() => setEditColor(col)} />
                ))}
              </div>
            </div>
            <div className="modal-actions"><button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn" onClick={saveSettings} disabled={!editName.trim()}>Save</button></div>
            <div className="danger-zone">
              <div><b>Delete project</b><span>Removes this project and all its sections, tasks and tags. Can’t be undone.</span></div>
              <button className="btn-danger" onClick={deleteProject}><Icon name="trash" size={15} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
