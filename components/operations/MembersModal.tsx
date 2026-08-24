"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { avatarColor, initials } from "@/lib/ops";
import type { Member } from "@/lib/types";

export default function MembersModal({
  members, onClose, onAdd, onRemove,
}: {
  members: Member[];
  onClose: () => void;
  onAdd: (name: string, email: string) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function add() {
    if (!name.trim()) return;
    onAdd(name.trim(), email.trim());
    setName(""); setEmail("");
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Project members</h3><button className="x-btn" onClick={onClose}>✕</button></div>

        {members.length === 0 && <p className="muted" style={{ marginBottom: 12 }}>No members yet. Add the people working on this project.</p>}
        {members.map((m) => (
          <div className="member-row" key={m.id}>
            <span className="mini-av" style={{ background: avatarColor(m.name) }}>{initials(m.name)}</span>
            <div className="member-info"><b>{m.name}</b>{m.email && <span>{m.email}</span>}</div>
            <button className="sub-del" onClick={() => onRemove(m.id)} title="Remove"><Icon name="trash" size={15} /></button>
          </div>
        ))}

        <div className="add-member">
          <div className="field-row" style={{ marginTop: 8 }}>
            <div className="field" style={{ margin: 0 }}><label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" onKeyDown={(e) => e.key === "Enter" && add()} /></div>
            <div className="field" style={{ margin: 0 }}><label>Email (optional)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@agency.com" onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          </div>
          <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={add}>+ Add member</button>
        </div>
      </div>
    </div>
  );
}
