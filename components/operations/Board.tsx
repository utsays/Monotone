"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  horizontalListSortingStrategy, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import DateChip, { fmtShort } from "@/components/DateChip";
import TaskModal from "./TaskModal";
import MembersModal from "./MembersModal";
import FilterSelect from "@/components/FilterSelect";
import { ListView, TaskCalendar } from "./TaskViews";
import { STATES, STATE_LABEL, tagChip, labelColor, daysBetween } from "@/lib/ops";
import type { Project, Section, Task, Subtask, Member, Tag, TaskState } from "@/lib/types";

type ViewMode = "board" | "list" | "calendar";

const UNSORTED = "__unsorted__";
const STATE_DOT: Record<string, string> = { not_started: "#b8bcc2", in_progress: "#FF5A1F", waiting: "#7a7f87", blocked: "#c4381a", done: "#1b1c1f" };
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

const MIGRATION_SQL = `create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null, email text, created_at timestamptz default now());
create unique index if not exists members_proj_name on public.members(project_id, lower(name));
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null, color text, created_at timestamptz default now());
create unique index if not exists tags_proj_name on public.tags(project_id, lower(name));
alter table public.tasks add column if not exists assignee_id uuid;
do $$ begin alter table public.tasks add constraint tasks_assignee_fk foreign key (assignee_id) references public.members(id) on delete set null; exception when duplicate_object then null; end $$;
alter table public.subtasks add column if not exists start_date date;
alter table public.subtasks add column if not exists end_date date;
alter table public.members enable row level security;
alter table public.tags enable row level security;
drop policy if exists "team all members" on public.members;
create policy "team all members" on public.members for all to authenticated using (true) with check (true);
drop policy if exists "team all tags" on public.tags;
create policy "team all tags" on public.tags for all to authenticated using (true) with check (true);
do $$ begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.tags; exception when duplicate_object then null; end $$;
insert into public.members(project_id, name)
select distinct t.project_id, t.assignee from public.tasks t
where t.assignee is not null and t.assignee <> ''
  and not exists (select 1 from public.members m where m.project_id=t.project_id and lower(m.name)=lower(t.assignee));
update public.tasks t set assignee_id = m.id from public.members m
where m.project_id=t.project_id and lower(m.name)=lower(t.assignee) and t.assignee is not null and t.assignee_id is null;
insert into public.tags(project_id, name)
select distinct t.project_id, l from public.tasks t, unnest(t.labels) as l
where not exists (select 1 from public.tags tg where tg.project_id=t.project_id and lower(tg.name)=lower(l));`;

function isMissing(err: { code?: string; message?: string } | null) {
  return !!err && (err.code === "42P01" || err.code === "42703" || /does not exist/i.test(err.message ?? ""));
}

export default function Board() {
  if (!isSupabaseConfigured())
    return <div className="card"><div className="empty"><h4>Connect Supabase to use the board</h4><p className="muted">This module saves to your cloud database.</p></div></div>;
  return <BoardInner />;
}

function BoardInner() {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);

  const [sectionMap, setSectionMap] = useState<Record<string, Section>>({});
  const [taskMap, setTaskMap] = useState<Record<string, Task>>({});
  const [containerOrder, setContainerOrder] = useState<string[]>([]);
  const [items, setItems] = useState<Record<string, string[]>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [subs, setSubs] = useState<Subtask[]>([]);

  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [view, setView] = useState<ViewMode>("board");

  const [fText, setFText] = useState("");
  const [fAssignee, setFAssignee] = useState<string[]>([]);
  const [fTags, setFTags] = useState<string[]>([]);

  const [activeDrag, setActiveDrag] = useState<{ id: string; type: "task" | "section" } | null>(null);
  const draggingRef = useRef(false);
  const openedTaskRef = useRef<string | null>(null);
  const itemsRef = useRef(items); itemsRef.current = items;
  const orderRef = useRef(containerOrder); orderRef.current = containerOrder;

  const filterActive = !!(fText || fAssignee.length || fTags.length);
  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const tagByName = useMemo(() => Object.fromEntries(tags.map((t) => [t.name.toLowerCase(), t])), [tags]);
  const activeProjectObj = useMemo(() => projects.find((p) => p.id === activeProject) ?? null, [projects, activeProject]);
  const clearFilters = () => { setFText(""); setFAssignee([]); setFTags([]); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase.from("projects").select("*").order("created_at");
    if (error) { if (isMissing(error)) setSetupNeeded(true); setLoading(false); return; }
    setProjects(data as Project[]);
    const urlPid = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("project") : null;
    setActiveProject((cur) => cur ?? urlPid ?? (data.length ? (data[0] as Project).id : null));
    setLoading(false);
  }, [supabase]);

  const loadBoard = useCallback(async (pid: string) => {
    const [secs, tks, mem, tg] = await Promise.all([
      supabase.from("sections").select("*").eq("project_id", pid).order("position"),
      supabase.from("tasks").select("*").eq("project_id", pid).order("position"),
      supabase.from("members").select("*").order("name"),
      supabase.from("tags").select("*").eq("project_id", pid).order("name"),
    ]);
    if ((tks.error && isMissing(tks.error)) || (mem.error && isMissing(mem.error))) { setSetupNeeded(true); return; }
    const sections = (secs.data ?? []) as Section[];
    const tasks = (tks.data ?? []) as Task[];
    setSectionMap(Object.fromEntries(sections.map((s) => [s.id, s])));
    setTaskMap(Object.fromEntries(tasks.map((t) => [t.id, t])));
    setMembers((mem.data ?? []) as Member[]);
    setTags((tg.data ?? []) as Tag[]);
    const order = sections.map((s) => s.id);
    setContainerOrder(order);
    const it: Record<string, string[]> = { [UNSORTED]: [] };
    order.forEach((id) => (it[id] = []));
    tasks.forEach((t) => { const c = t.section_id && it[t.section_id] ? t.section_id : UNSORTED; it[c].push(t.id); });
    setItems(it);
    const ids = tasks.map((t) => t.id);
    if (ids.length) { const { data: st } = await supabase.from("subtasks").select("*").in("task_id", ids).order("position"); setSubs((st ?? []) as Subtask[]); }
    else setSubs([]);
    if (typeof window !== "undefined") {
      const urlTask = new URLSearchParams(window.location.search).get("task");
      if (urlTask && openedTaskRef.current !== urlTask) {
        const t = tasks.find((x) => x.id === urlTask);
        if (t) {
          openedTaskRef.current = urlTask;
          setEditing(t);
          const u = new URL(window.location.href); u.searchParams.delete("task"); window.history.replaceState({}, "", u);
        }
      }
    }
  }, [supabase]);

  const ensureMe = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: byId } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
    if (byId) return;
    const byEmail = user.email ? (await supabase.from("members").select("id,user_id").eq("email", user.email).maybeSingle()).data : null;
    if (byEmail && !byEmail.user_id) {
      await supabase.from("members").update({ user_id: user.id }).eq("id", byEmail.id);
    } else if (!byEmail) {
      await supabase.from("members").insert({ name: (user.email ?? "me").split("@")[0], email: user.email, user_id: user.id });
    }
  }, [supabase]);

  useEffect(() => { ensureMe().then(loadProjects); }, [ensureMe, loadProjects]);

  useEffect(() => {
    if (!activeProject) return;
    loadBoard(activeProject);
    const reload = () => { if (!draggingRef.current) loadBoard(activeProject); };
    const ch = supabase.channel(`b-${activeProject}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${activeProject}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "sections", filter: `project_id=eq.${activeProject}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `project_id=eq.${activeProject}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tags", filter: `project_id=eq.${activeProject}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeProject, supabase, loadBoard]);

  // ---------- mutations ----------
  async function createProject() {
    const name = projectName.trim(); if (!name) return;
    const { data } = await supabase.from("projects").insert({ name }).select().single();
    setProjectName(""); setNewProjectOpen(false); await loadProjects();
    if (data) setActiveProject((data as Project).id);
  }
  async function renameProject() {
    const name = settingsName.trim();
    if (!name || !activeProject) return;
    await supabase.from("projects").update({ name }).eq("id", activeProject);
    setSettingsOpen(false);
    await loadProjects();
  }
  async function deleteProject() {
    if (!activeProject) return;
    const name = activeProjectObj?.name ?? "this project";
    if (!confirm(`Delete "${name}"? All its sections, tasks and tags will be permanently removed. This cannot be undone.`)) return;
    await supabase.from("projects").delete().eq("id", activeProject);
    const remaining = projects.filter((p) => p.id !== activeProject);
    setSettingsOpen(false);
    setProjects(remaining);
    setActiveProject(remaining.length ? remaining[0].id : null);
    await loadProjects();
  }
  async function addSection() {
    const name = sectionName.trim(); if (!name || !activeProject) return;
    const pos = containerOrder.length;
    await supabase.from("sections").insert({ project_id: activeProject, name, position: pos });
    setSectionName(""); setAddingSection(false); loadBoard(activeProject);
  }
  async function renameSection(id: string, name: string) {
    setRenamingId(null); if (!name.trim()) return;
    await supabase.from("sections").update({ name: name.trim() }).eq("id", id);
    if (activeProject) loadBoard(activeProject);
  }
  async function deleteSection(id: string) {
    if (!confirm("Delete this section? Its tasks move to Unsorted.")) return;
    await supabase.from("sections").delete().eq("id", id);
    if (activeProject) loadBoard(activeProject);
  }
  async function saveTask(form: Partial<Task>) {
    const payload = { title: form.title, description: form.description || null, section_id: form.section_id ?? null,
      state: form.state, labels: form.labels ?? [], assignee_id: form.assignee_id ?? null,
      start_date: form.start_date || null, end_date: form.end_date || null };
    if (form.id) await supabase.from("tasks").update(payload).eq("id", form.id);
    else await supabase.from("tasks").insert({ ...payload, project_id: activeProject, position: Date.now() });
    setEditing(null); setCreating(null);
    if (activeProject) loadBoard(activeProject);
  }
  async function deleteTask(id: string) { setEditing(null); await supabase.from("tasks").delete().eq("id", id); if (activeProject) loadBoard(activeProject); }
  async function quickState(id: string, state: TaskState) {
    setTaskMap((m) => ({ ...m, [id]: { ...m[id], state } }));
    await supabase.from("tasks").update({ state }).eq("id", id);
  }
  async function updateTaskDate(id: string, field: "start_date" | "end_date", value: string | null) {
    setTaskMap((m) => ({ ...m, [id]: { ...m[id], [field]: value } }));
    await supabase.from("tasks").update({ [field]: value }).eq("id", id);
  }
  async function addMember(name: string, email: string) {
    await supabase.from("members").insert({ name, email: email || null });
    if (activeProject) loadBoard(activeProject);
  }
  async function removeMember(id: string) { await supabase.from("members").delete().eq("id", id); if (activeProject) loadBoard(activeProject); }
  async function createTag(name: string, color: string) {
    if (!activeProject) return;
    await supabase.from("tags").insert({ project_id: activeProject, name, color });
    loadBoard(activeProject);
  }
  async function deleteTag(id: string) { await supabase.from("tags").delete().eq("id", id); if (activeProject) loadBoard(activeProject); }
  async function addSubtask(taskId: string, title: string) { await supabase.from("subtasks").insert({ task_id: taskId, title, position: Date.now() }); if (activeProject) loadBoard(activeProject); }
  async function updateSubtask(id: string, patch: Partial<Subtask>) {
    setSubs((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from("subtasks").update(patch).eq("id", id);
  }
  async function deleteSubtask(id: string) { setSubs((s) => s.filter((x) => x.id !== id)); await supabase.from("subtasks").delete().eq("id", id); }

  // ---------- drag ----------
  const findContainer = (id: string) => (id in itemsRef.current ? id : Object.keys(itemsRef.current).find((k) => itemsRef.current[k].includes(id)));

  function onDragStart(e: DragStartEvent) {
    draggingRef.current = true;
    const type = e.active.data.current?.type === "section" ? "section" : "task";
    setActiveDrag({ id: String(e.active.id), type });
  }
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e; if (!over) return;
    const activeId = String(active.id), overId = String(over.id);

    // dragging a section: reorder columns live so they shift under the cursor
    if (activeId in itemsRef.current) {
      const overContainer = overId in itemsRef.current ? overId : findContainer(overId);
      if (!overContainer || overContainer === UNSORTED || overContainer === activeId) return;
      setContainerOrder((order) => {
        const oldI = order.indexOf(activeId), newI = order.indexOf(overContainer);
        if (oldI < 0 || newI < 0 || oldI === newI) return order;
        return arrayMove(order, oldI, newI);
      });
      return;
    }

    const from = findContainer(activeId), to = findContainer(overId);
    if (!from || !to || from === to) return;
    setItems((prev) => {
      const fromItems = prev[from], toItems = prev[to];
      const overIndex = toItems.indexOf(overId);
      let newIndex = overId in prev ? toItems.length : overIndex >= 0 ? overIndex : toItems.length;
      return { ...prev, [from]: fromItems.filter((i) => i !== activeId), [to]: [...toItems.slice(0, newIndex), activeId, ...toItems.slice(newIndex)] };
    });
  }
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDrag(null);
    if (!over) { draggingRef.current = false; return; }
    const activeId = String(active.id), overId = String(over.id);

    if (activeDrag?.type === "section" || activeId in itemsRef.current) { // section reorder (already applied live in onDragOver)
      const next = orderRef.current;
      await Promise.all(next.map((sid, idx) => supabase.from("sections").update({ position: idx }).eq("id", sid)));
      draggingRef.current = false; if (activeProject) loadBoard(activeProject); return;
    }

    // task move / reorder
    const from = findContainer(activeId), to = findContainer(overId);
    if (from && to) {
      let list = itemsRef.current[to];
      if (from === to) {
        const oldI = list.indexOf(activeId), newI = list.indexOf(overId);
        if (oldI >= 0 && newI >= 0 && oldI !== newI) { list = arrayMove(list, oldI, newI); setItems((p) => ({ ...p, [to]: list })); }
      }
      const section_id = to === UNSORTED ? null : to;
      await Promise.all(list.map((id, idx) => supabase.from("tasks").update({ section_id, position: idx }).eq("id", id)));
    }
    draggingRef.current = false; if (activeProject) loadBoard(activeProject);
  }

  function copySql() { navigator.clipboard?.writeText(MIGRATION_SQL); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  const subCount = (taskId: string) => { const s = subs.filter((x) => x.task_id === taskId); return { total: s.length, done: s.filter((x) => x.done).length }; };
  const visible = (id: string) => {
    const t = taskMap[id]; if (!t) return false;
    if (fText && !t.title.toLowerCase().includes(fText.toLowerCase())) return false;
    if (fAssignee.length && (!t.assignee_id || !fAssignee.includes(t.assignee_id))) return false;
    if (fTags.length && !(t.labels ?? []).some((l) => fTags.includes(l))) return false;
    return true;
  };

  // ---------- render ----------
  if (setupNeeded)
    return (
      <div className="card setup">
        <h4 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>One-time update needed</h4>
        <p className="muted">Your database needs the members & tags tables. Open your{" "}
          <a href="https://supabase.com/dashboard/project/dxkaegvahrkogqdykwcq/sql/new" target="_blank" rel="noreferrer" style={{ textDecoration: "underline", fontWeight: 700 }}>Supabase SQL Editor</a>, paste this, Run, then refresh.</p>
        <pre>{MIGRATION_SQL}</pre>
        <button className="btn btn-sm" onClick={copySql}>{copied ? "Copied ✓" : "Copy SQL"}</button>
      </div>
    );
  if (loading) return <div className="card"><div className="empty"><p className="muted">Loading…</p></div></div>;

  const hasUnsorted = (items[UNSORTED]?.length ?? 0) > 0;
  const editingSubs = editing ? subs.filter((s) => s.task_id === editing.id) : [];

  const orderedSections = containerOrder.map((id) => sectionMap[id]).filter(Boolean) as Section[];
  const listGroups = [
    ...(hasUnsorted ? [{ id: UNSORTED, name: "Unsorted" }] : []),
    ...orderedSections.map((s) => ({ id: s.id, name: s.name })),
  ].map((g) => ({ ...g, tasks: (items[g.id] ?? []).filter(visible).map((id) => taskMap[id]).filter(Boolean) as Task[] }));
  const allVisibleTasks = Object.values(taskMap).filter((t) => visible(t.id));

  return (
    <>
      <div className="ops-bar">
        <div className="proj-tabs">
          {projects.map((p) => (
            <button key={p.id} className={`proj-tab${p.id === activeProject ? " active" : ""}`} onClick={() => setActiveProject(p.id)}>
              <span className="cdot" /> {p.name}
            </button>
          ))}
          <button className="proj-tab" onClick={() => setNewProjectOpen(true)}>+ New project</button>
          {activeProject && (
            <button className="proj-cog" title="Project settings" onClick={() => { setSettingsName(activeProjectObj?.name ?? ""); setSettingsOpen(true); }}>
              <Icon name="settings" size={16} />
            </button>
          )}
        </div>
        {activeProject && (
          <div className="ops-tools">
            <div className="view-toggle">
              <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}><Icon name="grid" size={15} /> Board</button>
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><Icon name="list" size={15} /> List</button>
              <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}><Icon name="calendar" size={15} /> Calendar</button>
            </div>
            <label className="mini-search"><Icon name="search" size={16} /><input placeholder="Search tasks" value={fText} onChange={(e) => setFText(e.target.value)} /></label>
            <FilterSelect label="All assignees" icon="users" value={fAssignee} onChange={setFAssignee}
              options={members.map((m) => ({ value: m.id, label: m.name }))} />
            <FilterSelect label="All tags" multi value={fTags} onChange={setFTags}
              options={tags.map((t) => ({ value: t.name, label: t.name, color: tagChip(t).fg }))} />
            <button className="tool-btn" onClick={() => setMembersOpen(true)}><Icon name="users" size={16} /> Members</button>
          </div>
        )}
      </div>

      {filterActive && (
        <div className="filter-note">
          {view === "board" ? "Drag reordering is paused while filtering." : "Filters applied."}
          <span className="mini-link" onClick={clearFilters}>Clear filters</span>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card"><div className="empty"><h4>Create your first project</h4><p className="muted">Group tasks into sections like a Trello board.</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => setNewProjectOpen(true)}>+ New project</button></div></div>
      ) : view === "list" ? (
        <ListView groups={listGroups} memberMap={memberMap} tagByName={tagByName}
          onOpenTask={setEditing} onQuickState={quickState} onDateChange={updateTaskDate} />
      ) : view === "calendar" ? (
        <TaskCalendar tasks={allVisibleTasks} memberMap={memberMap} tagByName={tagByName} onOpenTask={setEditing} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="board">
            {hasUnsorted && (
              <Column id={UNSORTED} title="Unsorted" deletable={false} sortableSection={false}
                taskIds={(items[UNSORTED] ?? []).filter(visible)} {...{ taskMap, memberMap, tagByName, subCount, filterActive }}
                onOpenTask={setEditing} onQuickState={quickState} onAddTask={() => {}} onDateChange={updateTaskDate} />
            )}
            <SortableContext items={containerOrder} strategy={horizontalListSortingStrategy} disabled={filterActive}>
              {containerOrder.map((cid) => {
                const sec = sectionMap[cid]; if (!sec) return null;
                return (
                  <Column key={cid} id={cid} title={sec.name} deletable sortableSection
                    taskIds={(items[cid] ?? []).filter(visible)} {...{ taskMap, memberMap, tagByName, subCount, filterActive }}
                    renaming={renamingId === cid} onStartRename={() => setRenamingId(cid)} onRename={(v) => renameSection(cid, v)} onCancelRename={() => setRenamingId(null)}
                    onDelete={() => deleteSection(cid)} onOpenTask={setEditing} onQuickState={quickState} onAddTask={() => setCreating(cid)} onDateChange={updateTaskDate} />
                );
              })}
            </SortableContext>
            <div className="add-section">
              {addingSection ? (
                <div className="box">
                  <input className="sec-edit" autoFocus placeholder="Section name" value={sectionName} onChange={(e) => setSectionName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addSection(); if (e.key === "Escape") { setAddingSection(false); setSectionName(""); } }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn btn-sm" onClick={addSection}>Add</button>
                    <button className="btn-ghost btn-sm" onClick={() => { setAddingSection(false); setSectionName(""); }}>Cancel</button>
                  </div>
                </div>
              ) : <button onClick={() => setAddingSection(true)}><Icon name="plus" size={16} /> Add section</button>}
            </div>
          </div>
          <DragOverlay>
            {activeDrag?.type === "task" && taskMap[activeDrag.id]
              ? <CardBody task={taskMap[activeDrag.id]} memberMap={memberMap} tagByName={tagByName} sub={subCount(activeDrag.id)} overlay />
              : activeDrag?.type === "section" && sectionMap[activeDrag.id]
              ? <div className="col" style={{ opacity: 0.9 }}><div className="col-head"><span className="sec-title"><span className="nm">{sectionMap[activeDrag.id].name}</span></span></div></div>
              : null}
          </DragOverlay>
        </DndContext>
      )}

      {(editing || creating) && (
        <TaskModal task={editing} sections={containerOrder.map((id) => sectionMap[id]).filter(Boolean) as Section[]}
          members={members} tags={tags} subtasks={editingSubs}
          defaultSectionId={creating ?? editing?.section_id ?? (containerOrder[0] ?? null)}
          onClose={() => { setEditing(null); setCreating(null); }} onSave={saveTask} onDelete={editing ? () => deleteTask(editing.id) : undefined}
          onAddSubtask={addSubtask} onUpdateSubtask={updateSubtask} onDeleteSubtask={deleteSubtask}
          onCreateTag={createTag} onDeleteTag={deleteTag} />
      )}
      {membersOpen && <MembersModal members={members} onClose={() => setMembersOpen(false)} onAdd={addMember} onRemove={removeMember} />}
      {newProjectOpen && (
        <div className="modal-bg" onClick={() => setNewProjectOpen(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h3>New project</h3><button className="x-btn" onClick={() => setNewProjectOpen(false)}>✕</button></div>
            <div className="field"><label>Project name</label>
              <input autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Agency Launch" onKeyDown={(e) => e.key === "Enter" && createProject()} /></div>
            <div className="modal-actions"><button className="btn-ghost" onClick={() => setNewProjectOpen(false)}>Cancel</button><button className="btn" onClick={createProject}>Create</button></div>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="modal-bg" onClick={() => setSettingsOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h3>Project settings</h3><button className="x-btn" onClick={() => setSettingsOpen(false)}>✕</button></div>
            <div className="field"><label>Project name</label>
              <input autoFocus value={settingsName} onChange={(e) => setSettingsName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && renameProject()} /></div>
            <div className="modal-actions"><button className="btn-ghost" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="btn" onClick={renameProject} disabled={!settingsName.trim()}>Save</button></div>
            <div className="danger-zone">
              <div>
                <b>Delete project</b>
                <span>Removes this project and all its sections, tasks and tags. Can’t be undone.</span>
              </div>
              <button className="btn-danger" onClick={deleteProject}><Icon name="trash" size={15} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------- Column ----------------
function Column(props: {
  id: string; title: string; deletable: boolean; sortableSection: boolean; taskIds: string[];
  taskMap: Record<string, Task>; memberMap: Record<string, Member>; tagByName: Record<string, Tag>;
  subCount: (id: string) => { total: number; done: number }; filterActive: boolean;
  renaming?: boolean; onStartRename?: () => void; onRename?: (v: string) => void; onCancelRename?: () => void; onDelete?: () => void;
  onOpenTask: (t: Task) => void; onQuickState: (id: string, s: TaskState) => void; onAddTask: () => void;
  onDateChange: (id: string, field: "start_date" | "end_date", value: string | null) => void;
}) {
  const { id, title, deletable, sortableSection, taskIds, taskMap, memberMap, tagByName, subCount, filterActive } = props;
  const disabled = sortableSection ? filterActive : { draggable: true, droppable: filterActive };
  const sortable = useSortable({ id, data: { type: "section" }, disabled });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, opacity: sortable.isDragging ? 0.4 : 1 };

  return (
    <div ref={sortable.setNodeRef} style={style} className="col">
      <div className="col-head">
        {props.renaming ? (
          <input className="sec-edit" autoFocus defaultValue={title}
            onBlur={(e) => props.onRename?.(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") props.onRename?.((e.target as HTMLInputElement).value); if (e.key === "Escape") props.onCancelRename?.(); }} />
        ) : (
          <span className="sec-title">
            {sortableSection && <span className="drag-handle" {...sortable.attributes} {...sortable.listeners}><Icon name="grip" size={16} /></span>}
            <span className="nm" onClick={() => deletable && props.onStartRename?.()} title={deletable ? "Click to rename" : undefined}>{title}</span>
            <span className="cnt">{taskIds.length}</span>
          </span>
        )}
        {deletable && !props.renaming && <span className="sec-actions"><button className="sec-x" onClick={props.onDelete} title="Delete section"><Icon name="trash" size={15} /></button></span>}
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy} disabled={filterActive}>
        <div className="col-body">
          {taskIds.map((tid) => taskMap[tid] && (
            <SortableCard key={tid} task={taskMap[tid]} memberMap={memberMap} tagByName={tagByName} sub={subCount(tid)}
              disabled={filterActive} onOpen={() => props.onOpenTask(taskMap[tid])} onQuickState={(s) => props.onQuickState(tid, s)}
              onDateChange={(f, v) => props.onDateChange(tid, f, v)} />
          ))}
        </div>
      </SortableContext>
      {id !== UNSORTED && <button className="col-add" onClick={props.onAddTask}>+ Add task</button>}
    </div>
  );
}

// ---------------- Card ----------------
function SortableCard({ task, memberMap, tagByName, sub, disabled, onOpen, onQuickState, onDateChange }: {
  task: Task; memberMap: Record<string, Member>; tagByName: Record<string, Tag>; sub: { total: number; done: number };
  disabled: boolean; onOpen: () => void; onQuickState: (s: TaskState) => void;
  onDateChange: (field: "start_date" | "end_date", value: string | null) => void;
}) {
  const sortable = useSortable({ id: task.id, data: { type: "task" }, disabled });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, opacity: sortable.isDragging ? 0.35 : 1 };
  return (
    <div ref={sortable.setNodeRef} style={style} {...sortable.attributes} {...sortable.listeners} onClick={onOpen}>
      <CardBody task={task} memberMap={memberMap} tagByName={tagByName} sub={sub} onQuickState={onQuickState} onDateChange={onDateChange} />
    </div>
  );
}

function CardBody({ task, memberMap, tagByName, sub, onQuickState, onDateChange, overlay }: {
  task: Task; memberMap: Record<string, Member>; tagByName: Record<string, Tag>; sub: { total: number; done: number };
  onQuickState?: (s: TaskState) => void; onDateChange?: (field: "start_date" | "end_date", value: string | null) => void; overlay?: boolean;
}) {
  const est = daysBetween(task.start_date, task.end_date);
  const assignee = task.assignee_id ? memberMap[task.assignee_id] : null;
  const done = task.state === "done";
  const overdue = !!task.end_date && task.end_date < todayStr() && !done;
  const stop = (e: React.SyntheticEvent) => { e.stopPropagation(); };
  return (
    <div className={`tcard${done ? " done" : ""}${overlay ? " overlay" : ""}`}>
      <div className="tcard-h">
        <span className={`qcheck${done ? " on" : ""}`} onPointerDown={stop} onClick={(e) => { stop(e); onQuickState?.(done ? "not_started" : "done"); }} title="Toggle complete">
          {done && <Icon name="check" size={12} strokeWidth={3.2} />}
        </span>
        <span className="ttl">{task.title}</span>
      </div>
      {task.labels?.length > 0 && (
        <div className="labs">
          {task.labels.map((l) => { const c = tagByName[l.toLowerCase()] ? tagChip(tagByName[l.toLowerCase()]) : labelColor(l); return <span key={l} className="lab" style={{ background: c.bg, color: c.fg }}>{l}</span>; })}
        </div>
      )}
      <div className="metaline">
        {est != null && <span className="est">{est}d</span>}
        {onQuickState ? (
          <span className="state-inline" onPointerDown={stop} onClick={stop}>
            <span className="sd" style={{ background: STATE_DOT[task.state] }} />
            <select value={task.state} onChange={(e) => onQuickState(e.target.value as TaskState)}>
              {STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </span>
        ) : (
          <span className={`state ${task.state}`}><span className="sd" /> {STATE_LABEL[task.state]}</span>
        )}
      </div>
      <div className="tcard-foot">
        <div className="left">
          {onDateChange ? (
            <DateChip value={task.end_date} onChange={(v) => onDateChange("end_date", v)} placeholder="＋ date" overdue={overdue} stopDrag />
          ) : task.end_date ? <span className="date-chip">{fmtShort(task.end_date)}</span> : null}
          {sub.total > 0 && <span className="sub-ind"><Icon name="check" size={12} /> {sub.done}/{sub.total}</span>}
        </div>
        {assignee && <Avatar name={assignee.name} url={assignee.avatar_url} color={assignee.avatar_color} size={26} />}
      </div>
    </div>
  );
}
