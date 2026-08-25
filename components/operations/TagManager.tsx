"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { TAG_PALETTE, tagChip } from "@/lib/ops";
import type { Tag } from "@/lib/types";

export default function TagManager({
  tags, onCreate, onUpdate, onDelete, onClose,
}: {
  tags: Tag[];
  onCreate: (name: string, color: string) => void;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_PALETTE[0]);

  function create() {
    const n = newName.trim();
    if (!n) return;
    if (tags.some((t) => t.name.toLowerCase() === n.toLowerCase())) { setNewName(""); return; }
    onCreate(n, newColor);
    setNewName("");
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Manage tags</h3><button className="x-btn" onClick={onClose}>✕</button></div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: -8, marginBottom: 14 }}>
          Renaming or deleting a tag updates every task that uses it.
        </p>

        <div className="tagmgr-list">
          {tags.length === 0 && <div className="empty" style={{ padding: "18px 0" }}><p className="muted">No tags yet. Create one below.</p></div>}
          {tags.map((t) => {
            const c = tagChip(t);
            return (
              <div key={t.id} className="tagmgr-row">
                <span className="lab" style={{ background: c.bg, color: c.fg }}>{t.name}</span>
                <input className="tagmgr-name" defaultValue={t.name}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.name) onUpdate(t.id, { name: v }); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                <div className="swatches">
                  {TAG_PALETTE.map((col) => (
                    <span key={col} className={`sw${(t.color ?? "").toLowerCase() === col.toLowerCase() ? " on" : ""}`}
                      style={{ background: col }} onClick={() => onUpdate(t.id, { color: col })} />
                  ))}
                </div>
                <button className="sub-del" title="Delete tag" onClick={() => { if (confirm(`Delete tag "${t.name}"? It will be removed from all tasks.`)) onDelete(t.id); }}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="tagmgr-create">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New tag name"
            onKeyDown={(e) => e.key === "Enter" && create()} />
          <div className="swatches">
            {TAG_PALETTE.map((col) => (
              <span key={col} className={`sw${newColor === col ? " on" : ""}`} style={{ background: col }} onClick={() => setNewColor(col)} />
            ))}
          </div>
          <button className="btn btn-sm" onClick={create} disabled={!newName.trim()}>Add tag</button>
        </div>
      </div>
    </div>
  );
}
