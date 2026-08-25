"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import AvatarStack from "@/components/AvatarStack";
import DateChip from "@/components/DateChip";
import Select from "@/components/Select";
import { STATES, tagChip, labelColor, priorityMeta } from "@/lib/ops";
import type { Task, Member, Tag, TaskState } from "@/lib/types";

const STATE_DOT: Record<string, string> = { not_started: "#b8bcc2", in_progress: "#FF5A1F", waiting: "#7a7f87", blocked: "#c4381a", done: "#1b1c1f" };
const todayStr = () => new Date().toISOString().slice(0, 10);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Handlers = {
  memberMap: Record<string, Member>;
  tagByName: Record<string, Tag>;
  onOpenTask: (t: Task) => void;
  onQuickState: (id: string, s: TaskState) => void;
  onDateChange: (id: string, field: "start_date" | "end_date", value: string | null) => void;
};

function labChip(l: string, tagByName: Record<string, Tag>) {
  return tagByName[l.toLowerCase()] ? tagChip(tagByName[l.toLowerCase()]) : labelColor(l);
}

/* ---------------- List view ---------------- */
export function ListView({
  groups, memberMap, tagByName, onOpenTask, onQuickState, onDateChange, onAddTask,
}: Handlers & { groups: { id: string; name: string; tasks: Task[] }[]; onAddTask: (sectionId: string) => void }) {
  const anyTasks = groups.some((g) => g.tasks.length > 0);
  if (!anyTasks && groups.length === 0)
    return <div className="card"><div className="empty"><p className="muted">No tasks match your filters.</p></div></div>;

  return (
    <div className="list-view">
      {groups.map((g) => (
        <div key={g.id} className="lv-group">
          <div className="lv-group-head"><span className="nm">{g.name}</span><span className="cnt">{g.tasks.length}</span></div>
          <div className="lv-rows">
            {g.tasks.map((t) => {
              const done = t.state === "done";
              const assignees = (t.assignee_ids ?? (t.assignee_id ? [t.assignee_id] : [])).map((id) => memberMap[id]).filter(Boolean) as Member[];
              const overdue = !!t.end_date && t.end_date < todayStr() && !done;
              const prio = priorityMeta(t.priority);
              const stop = (e: React.SyntheticEvent) => e.stopPropagation();
              return (
                <div key={t.id} className={`lv-row${done ? " done" : ""}`} onClick={() => onOpenTask(t)}>
                  <span className={`qcheck${done ? " on" : ""}`} onClick={(e) => { stop(e); onQuickState(t.id, done ? "not_started" : "done"); }} title="Toggle complete">
                    {done && <Icon name="tick" size={12} strokeWidth={3.2} />}
                  </span>
                  <span className="lv-title">
                    {prio && <span className="prio-dot" style={{ background: prio.color }} title={`${prio.label} priority`} />}
                    {t.title}
                  </span>
                  <span className="lv-tags">
                    {(t.labels ?? []).map((l) => { const c = labChip(l, tagByName); return <span key={l} className="lab" style={{ background: c.bg, color: c.fg }}>{l}</span>; })}
                  </span>
                  <span className="lv-state" onClick={stop}>
                    <Select variant="inline" ariaLabel="Task status" value={t.state} onChange={(v) => onQuickState(t.id, v as TaskState)}
                      options={STATES.map((s) => ({ value: s.key, label: s.label, color: STATE_DOT[s.key] }))} />
                  </span>
                  <span className="lv-date" onClick={stop}>
                    <DateChip value={t.end_date} onChange={(v) => onDateChange(t.id, "end_date", v)} placeholder="＋ date" overdue={overdue} />
                  </span>
                  <span className="lv-asg"><AvatarStack members={assignees} size={26} /></span>
                </div>
              );
            })}
            <button className="lv-add" onClick={() => onAddTask(g.id)}><Icon name="plus" size={14} /> Add task</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Calendar view ---------------- */
export function TaskCalendar({
  tasks, onOpenTask, onCreateOnDay, onReschedule,
}: Pick<Handlers, "onOpenTask"> & { tasks: Task[]; onCreateOnDay: (day: string) => void; onReschedule: (id: string, day: string) => void }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);

  const first = new Date(cursor.y, cursor.m, 1);
  const start = new Date(cursor.y, cursor.m, 1 - first.getDay());
  const cells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
    [start.getFullYear(), start.getMonth(), start.getDate()],
  );
  const todayIso = iso(new Date());
  const go = (delta: number) => { const d = new Date(cursor.y, cursor.m + delta, 1); setCursor({ y: d.getFullYear(), m: d.getMonth() }); };

  // A task occupies each day from its start (or end) through its end (or start).
  const dated = tasks.filter((t) => t.start_date || t.end_date);
  const onDay = (ds: string) => dated.filter((t) => {
    const s = t.start_date ?? t.end_date!;
    const e = t.end_date ?? t.start_date!;
    return s <= ds && e >= ds;
  });

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="cal-head" style={{ marginBottom: 14 }}>
        <div className="cal-nav">
          <button className="nav-b" onClick={() => go(-1)}><Icon name="chevronLeft" size={18} /></button>
          <button className="nav-b" onClick={() => go(1)}><Icon name="chevronRight" size={18} /></button>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginLeft: 6 }}>{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          const ds = iso(d);
          const inMonth = d.getMonth() === cursor.m;
          const dayTasks = onDay(ds);
          return (
            <div key={i}
              className={`cal-cell${inMonth ? "" : " out"}${ds === todayIso ? " today" : ""}${overDay === ds ? " drop" : ""}`}
              onDragOver={dragId ? (e) => { e.preventDefault(); if (overDay !== ds) setOverDay(ds); } : undefined}
              onDrop={dragId ? (e) => { e.preventDefault(); onReschedule(dragId, ds); setDragId(null); setOverDay(null); } : undefined}>
              <div className="cal-date">
                {d.getDate()}
                <button className="cal-add" title="Add task on this day" onClick={() => onCreateOnDay(ds)}><Icon name="plus" size={12} /></button>
              </div>
              {dayTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="cal-task" title={t.title} draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.id); setDragId(t.id); }}
                  onDragEnd={() => { setDragId(null); setOverDay(null); }}
                  onClick={() => onOpenTask(t)}>
                  <span className="cbar" style={{ background: STATE_DOT[t.state] ?? "#c3c7cc" }} />
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && <div className="cal-more">+{dayTasks.length - 3} more</div>}
            </div>
          );
        })}
      </div>
      {dated.length === 0 && <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>No tasks with dates yet — add a due date to a task to see it here.</p>}
    </div>
  );
}
