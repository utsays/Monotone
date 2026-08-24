"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { STATES, tagChip, TAG_PALETTE, daysBetween } from "@/lib/ops";
import type { Task, Section, Member, Tag, Subtask, TaskState } from "@/lib/types";

export default function TaskModal({
  task, sections, members, tags, subtasks, defaultSectionId,
  onClose, onSave, onDelete,
  onAddSubtask, onUpdateSubtask, onDeleteSubtask,
  onCreateTag, onDeleteTag,
}: {
  task: Task | null;
  sections: Section[];
  members: Member[];
  tags: Tag[];
  subtasks: Subtask[];
  defaultSectionId: string | null;
  onClose: () => void;
  onSave: (t: Partial<Task>) => void;
  onDelete?: () => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (id: string, patch: Partial<Subtask>) => void;
  onDeleteSubtask: (id: string) => void;
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [sectionId, setSectionId] = useState<string | null>(task?.section_id ?? defaultSectionId);
  const [state, setState] = useState<TaskState>(task?.state ?? "not_started");
  const [assigneeId, setAssigneeId] = useState<string | null>(task?.assignee_id ?? null);
  const [labels, setLabels] = useState<string[]>(task?.labels ?? []);
  const [start, setStart] = useState(task?.start_date ?? "");
  const [end, setEnd] = useState(task?.end_date ?? "");
  const [err, setErr] = useState("");
  const [newSub, setNewSub] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);
  const [manageTags, setManageTags] = useState(false);

  const est = daysBetween(start, end);

  function toggleTag(name: string) {
    setLabels((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  }
  function createTag() {
    const n = newTagName.trim();
    if (!n) return;
    onCreateTag(n, newTagColor);
    if (!labels.includes(n)) setLabels((c) => [...c, n]);
    setNewTagName(""); setShowNewTag(false);
  }
  function submit() {
    if (!title.trim()) return setErr("Please add a title.");
    if (!start || !end) return setErr("Start date and end date are both required.");
    if (end < start) return setErr("End date can’t be before the start date.");
    onSave({ id: task?.id, title: title.trim(), description, section_id: sectionId, state,
      assignee_id: assigneeId, labels, start_date: start, end_date: end });
  }

  const doneCt = subtasks.filter((s) => s.done).length;
  const pct = subtasks.length ? Math.round((doneCt / subtasks.length) * 100) : 0;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{task ? "Edit task" : "New task"}</h3><button className="x-btn" onClick={onClose}>✕</button></div>

        {err && <div className="form-msg err">{err}</div>}
        <div className="field"><label>Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" /></div>
        <div className="field"><label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details…" /></div>

        {/* Tags */}
        <div className="field">
          <label style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tags</span>
            <span className="mini-link" onClick={() => setManageTags((m) => !m)}>{manageTags ? "Done" : "Manage"}</span>
          </label>
          <div className="lab-pick">
            {tags.map((t) => { const c = tagChip(t); const on = labels.includes(t.name);
              return (
                <span key={t.id} className={`lab${on ? " on" : ""}`} style={{ background: c.bg, color: c.fg }} onClick={() => !manageTags && toggleTag(t.name)}>
                  {t.name}
                  {manageTags && <span className="lab-x" onClick={(e) => { e.stopPropagation(); onDeleteTag(t.id); setLabels((l) => l.filter((x) => x !== t.name)); }}>✕</span>}
                </span>
              ); })}
            {!showNewTag ? (
              <span className="lab lab-add" onClick={() => setShowNewTag(true)}>+ New tag</span>
            ) : (
              <span className="tag-create">
                <input autoFocus value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Tag name"
                  onKeyDown={(e) => e.key === "Enter" && createTag()} />
                <span className="swatches">
                  {TAG_PALETTE.map((c) => <span key={c} className={`sw${newTagColor === c ? " on" : ""}`} style={{ background: c }} onClick={() => setNewTagColor(c)} />)}
                </span>
                <button className="btn btn-sm" onClick={createTag}>Add</button>
              </span>
            )}
          </div>
        </div>

        <div className="field-row">
          <div className="field"><label>Section</label>
            <select value={sectionId ?? ""} onChange={(e) => setSectionId(e.target.value || null)}>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field"><label>State</label>
            <select value={state} onChange={(e) => setState(e.target.value as TaskState)}>
              {STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field"><label>Assignee</label>
            <select value={assigneeId ?? ""} onChange={(e) => setAssigneeId(e.target.value || null)}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Estimate (auto)</label>
            <div className="est-lock">{est != null ? `${est} day${est > 1 ? "s" : ""}` : "— set dates —"}<Icon name="clock" size={14} /></div>
          </div>
        </div>

        <div className="field-row">
          <div className="field"><label>Start date *</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="field"><label>End date *</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>

        {/* Subtasks */}
        <div className="field">
          <label>Subtasks {subtasks.length > 0 && `· ${doneCt}/${subtasks.length}`}</label>
          {!task ? (
            <p className="muted" style={{ fontSize: 12.5 }}>Save the task first, then add subtasks with their own dates.</p>
          ) : (
            <>
              {subtasks.length > 0 && <div className="sub-progress"><div className="fill" style={{ width: `${pct}%` }} /></div>}
              {subtasks.map((s) => (
                <div className="sub-row2" key={s.id}>
                  <span className={`sub-check${s.done ? " on" : ""}`} onClick={() => onUpdateSubtask(s.id, { done: !s.done })}>{s.done && <Icon name="check" size={13} strokeWidth={2.6} />}</span>
                  <input className={`sub-title${s.done ? " done" : ""}`} defaultValue={s.title}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== s.title && onUpdateSubtask(s.id, { title: e.target.value.trim() })} />
                  <input type="date" className="sub-date" title="Start" defaultValue={s.start_date ?? ""} onChange={(e) => onUpdateSubtask(s.id, { start_date: e.target.value || null })} />
                  <input type="date" className="sub-date" title="End" defaultValue={s.end_date ?? ""} onChange={(e) => onUpdateSubtask(s.id, { end_date: e.target.value || null })} />
                  <button className="sub-del" onClick={() => onDeleteSubtask(s.id)}><Icon name="trash" size={15} /></button>
                </div>
              ))}
              <div className="add-sub">
                <input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a subtask…"
                  onKeyDown={(e) => { if (e.key === "Enter" && newSub.trim()) { onAddSubtask(task.id, newSub.trim()); setNewSub(""); } }} />
                <button className="btn-ghost btn-sm" onClick={() => { if (newSub.trim()) { onAddSubtask(task.id, newSub.trim()); setNewSub(""); } }}>Add</button>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          {onDelete && <button className="del-link" onClick={onDelete}>Delete</button>}
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}>{task ? "Save" : "Add task"}</button>
        </div>
      </div>
    </div>
  );
}
