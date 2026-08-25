"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import DateChip from "@/components/DateChip";
import Select from "@/components/Select";
import MentionInput, { renderMentions } from "@/components/MentionInput";
import { STATES, PRIORITIES, tagChip, TAG_PALETTE, daysBetween } from "@/lib/ops";
import type { Task, Section, Member, Tag, Subtask, TaskState, TaskComment } from "@/lib/types";

function fmtWhen(iso: string) {
  const d = new Date(iso), now = Date.now(), diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATE_DOT: Record<string, string> = { not_started: "#b8bcc2", in_progress: "#FF5A1F", waiting: "#7a7f87", blocked: "#c4381a", done: "#1b1c1f" };

export default function TaskModal({
  task, sections, members, tags, subtasks, defaultSectionId, defaultStart, defaultEnd,
  onClose, onSave, onDelete,
  onAddSubtask, onUpdateSubtask, onDeleteSubtask, onCreateTag,
  comments = [], memberMap = {}, myMemberId = null, onAddComment, onDeleteComment,
}: {
  task: Task | null;
  sections: Section[];
  members: Member[];
  tags: Tag[];
  subtasks: Subtask[];
  defaultSectionId: string | null;
  defaultStart?: string | null;
  defaultEnd?: string | null;
  onClose: () => void;
  onSave: (t: Partial<Task>) => void;
  onDelete?: () => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (id: string, patch: Partial<Subtask>) => void;
  onDeleteSubtask: (id: string) => void;
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag?: (id: string) => void;
  comments?: TaskComment[];
  memberMap?: Record<string, Member>;
  myMemberId?: string | null;
  onAddComment?: (taskId: string, body: string) => void;
  onDeleteComment?: (id: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [sectionId, setSectionId] = useState<string | null>(task?.section_id ?? defaultSectionId);
  const [state, setState] = useState<TaskState>(task?.state ?? "not_started");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignee_ids ?? (task?.assignee_id ? [task.assignee_id] : []));
  const [labels, setLabels] = useState<string[]>(task?.labels ?? []);
  const [priority, setPriority] = useState<string>(task?.priority ?? "none");
  const [start, setStart] = useState<string | null>(task?.start_date ?? defaultStart ?? null);
  const [end, setEnd] = useState<string | null>(task?.end_date ?? defaultEnd ?? null);
  const [err, setErr] = useState("");
  const [newSub, setNewSub] = useState("");
  const [tagMenu, setTagMenu] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newComment, setNewComment] = useState("");

  function sendComment() {
    const text = newComment.trim();
    if (!text || !task?.id || !onAddComment) return;
    onAddComment(task.id, text);
    setNewComment("");
  }

  const est = daysBetween(start, end);
  const active = members.filter((m) => m.active !== false);

  function toggleTag(name: string) {
    setLabels((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  }
  function toggleAssignee(id: string) {
    setAssigneeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function createTag() {
    const n = newTag.trim();
    if (!n) return;
    let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    onCreateTag(n, TAG_PALETTE[h % TAG_PALETTE.length]);
    if (!labels.includes(n)) setLabels((c) => [...c, n]);
    setNewTag("");
  }
  function submit() {
    if (!title.trim()) return setErr("Please add a title.");
    if (!start || !end) return setErr("Pick a start date and an end date.");
    if (end < start) return setErr("End date can’t be before the start date.");
    onSave({ id: task?.id, title: title.trim(), description, section_id: sectionId, state,
      assignee_ids: assigneeIds, labels, priority, start_date: start, end_date: end });
  }

  const doneCt = subtasks.filter((s) => s.done).length;
  const pct = subtasks.length ? Math.round((doneCt / subtasks.length) * 100) : 0;
  const tagByName: Record<string, Tag> = Object.fromEntries(tags.map((t) => [t.name.toLowerCase(), t]));

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{task ? "Edit task" : "New task"}</h3><button className="x-btn" onClick={onClose}>✕</button></div>

        {err && <div className="form-msg err">{err}</div>}
        <div className="field"><label>Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" /></div>
        <div className="field"><label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details…" /></div>

        {/* Tags */}
        <div className="field">
          <label>Tags</label>
          <div className="tag-line">
            {labels.map((l) => { const c = tagByName[l.toLowerCase()] ? tagChip(tagByName[l.toLowerCase()]) : { bg: "#eceef0", fg: "#5a5f66" };
              return <span key={l} className="lab" style={{ background: c.bg, color: c.fg }}>{l}<span className="lab-x" onClick={() => toggleTag(l)}>✕</span></span>; })}
            <div className="tag-add-wrap">
              <button type="button" className="tag-add-btn" onClick={() => setTagMenu((m) => !m)}><Icon name="plus" size={14} /></button>
              {tagMenu && (
                <div className="tag-menu" onClick={(e) => e.stopPropagation()}>
                  {tags.filter((t) => !labels.includes(t.name)).map((t) => { const c = tagChip(t);
                    return <div key={t.id} className="tag-opt" onClick={() => { toggleTag(t.name); setTagMenu(false); }}><span className="dotk" style={{ background: c.fg }} />{t.name}</div>; })}
                  {tags.filter((t) => !labels.includes(t.name)).length === 0 && <div className="tag-opt muted">No more tags</div>}
                  <div className="tag-create-row">
                    <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" onKeyDown={(e) => e.key === "Enter" && (createTag(), setTagMenu(false))} />
                    <button className="btn btn-sm" onClick={() => { createTag(); setTagMenu(false); }}>Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignees (multiple) */}
        <div className="field">
          <label>Assignees {assigneeIds.length > 0 && `· ${assigneeIds.length}`}</label>
          <div className="assignee-pick">
            <button type="button" className={`asg-none${assigneeIds.length === 0 ? " sel" : ""}`} onClick={() => setAssigneeIds([])} title="Unassigned"><Icon name="users" size={16} /></button>
            {active.map((m) => (
              <button type="button" key={m.id} className={`asg-av${assigneeIds.includes(m.id) ? " sel" : ""}`} onClick={() => toggleAssignee(m.id)} title={m.name}>
                <Avatar name={m.name} url={m.avatar_url} color={m.avatar_color} size={30} />
                {assigneeIds.includes(m.id) && <span className="asg-tick"><Icon name="tick" size={11} strokeWidth={3.4} /></span>}
              </button>
            ))}
            {active.length === 0 && <span className="muted" style={{ fontSize: 12.5 }}>Add people in the Team tab.</span>}
          </div>
        </div>

        {/* Priority */}
        <div className="field">
          <label>Priority</label>
          <div className="prio-pick">
            <button type="button" className={`prio-opt${priority === "none" ? " on" : ""}`} onClick={() => setPriority("none")}>None</button>
            {PRIORITIES.map((p) => (
              <button type="button" key={p.key} className={`prio-opt${priority === p.key ? " on" : ""}`} onClick={() => setPriority(p.key)}>
                <span className="pd" style={{ background: p.color }} />{p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field"><label>Section</label>
            <Select value={sectionId ?? ""} onChange={(v) => setSectionId(v || null)}
              options={[{ value: "", label: "No section" }, ...sections.map((s) => ({ value: s.id, label: s.name }))]} />
          </div>
          <div className="field"><label>State</label>
            <Select value={state} onChange={(v) => setState(v as TaskState)}
              options={STATES.map((s) => ({ value: s.key, label: s.label, color: STATE_DOT[s.key] }))} />
          </div>
        </div>

        <div className="field-row">
          <div className="field"><label>Start</label>
            <DateChip value={start} onChange={setStart} placeholder="Set start" className="block" /></div>
          <div className="field"><label>End</label>
            <DateChip value={end} onChange={setEnd} placeholder="Set end" className="block" /></div>
        </div>
        <div className="est-hint">Estimate: <b>{est != null ? `${est} day${est > 1 ? "s" : ""}` : "—"}</b> <span className="muted">(auto from dates)</span></div>

        {/* Subtasks */}
        <div className="field" style={{ marginTop: 14 }}>
          <label>Subtasks {subtasks.length > 0 && `· ${doneCt}/${subtasks.length}`}</label>
          {!task ? (
            <p className="muted" style={{ fontSize: 12.5 }}>Save the task first, then add subtasks with their own dates.</p>
          ) : (
            <>
              {subtasks.length > 0 && <div className="sub-progress"><div className="fill" style={{ width: `${pct}%` }} /></div>}
              {subtasks.map((s) => (
                <div className="sub-row3" key={s.id}>
                  <span className={`sub-check${s.done ? " on" : ""}`} onClick={() => onUpdateSubtask(s.id, { done: !s.done })}>{s.done && <Icon name="tick" size={12} strokeWidth={3.2} />}</span>
                  <input className={`sub-title${s.done ? " done" : ""}`} defaultValue={s.title}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== s.title && onUpdateSubtask(s.id, { title: e.target.value.trim() })} />
                  <DateChip value={s.start_date} onChange={(v) => onUpdateSubtask(s.id, { start_date: v })} placeholder="start" className="tiny" />
                  <DateChip value={s.end_date} onChange={(v) => onUpdateSubtask(s.id, { end_date: v })} placeholder="end" className="tiny" />
                  <button className="sub-del" onClick={() => onDeleteSubtask(s.id)}><Icon name="trash" size={14} /></button>
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

        {/* Comments */}
        <div className="field" style={{ marginTop: 14 }}>
          <label>Comments {comments.length > 0 && `· ${comments.length}`}</label>
          {!task ? (
            <p className="muted" style={{ fontSize: 12.5 }}>Save the task first, then start a discussion here.</p>
          ) : (
            <div className="cmt-wrap">
              {comments.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>No comments yet. Start the thread below.</p>}
              {comments.map((c) => {
                const author = c.member_id ? memberMap[c.member_id] : null;
                return (
                  <div className="cmt" key={c.id}>
                    <Avatar name={author?.name ?? "?"} url={author?.avatar_url} color={author?.avatar_color} size={28} />
                    <div className="cmt-body">
                      <div className="cmt-head">
                        <b>{author?.name ?? "Someone"}</b>
                        <span className="cmt-time">{fmtWhen(c.created_at)}</span>
                        {onDeleteComment && (!c.member_id || c.member_id === myMemberId) && (
                          <button className="cmt-del" title="Delete comment" onClick={() => onDeleteComment(c.id)}><Icon name="trash" size={13} /></button>
                        )}
                      </div>
                      <p className="cmt-text">{renderMentions(c.body, members)}</p>
                    </div>
                  </div>
                );
              })}
              <div className="cmt-add">
                <MentionInput value={newComment} onChange={setNewComment} onSubmit={sendComment} members={members} placeholder="Write a comment…  @ to mention" />
                <button className="btn btn-sm" onClick={sendComment} disabled={!newComment.trim()}>Send</button>
              </div>
            </div>
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
