"use client";

import { useRef, useState, type JSX } from "react";
import Avatar from "./Avatar";
import type { Member } from "@/lib/types";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Highlight `@Name` tokens that match a known member. */
export function renderMentions(body: string, members: Member[]): (string | JSX.Element)[] | string {
  const named = members.filter((m) => m.name.trim());
  if (!named.length) return body;
  const sorted = [...named].sort((a, b) => b.name.length - a.name.length);
  const re = new RegExp(`@(${sorted.map((m) => escapeRe(m.name)).join("|")})`, "g");
  const out: (string | JSX.Element)[] = [];
  let last = 0, key = 0, m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) out.push(body.slice(last, m.index));
    out.push(<span key={key++} className="mention">@{m[1]}</span>);
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

export default function MentionInput({ value, onChange, onSubmit, members, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  members: Member[];
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const matches = open ? members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];

  function refresh(v: string, caret: number) {
    const mt = v.slice(0, caret).match(/@(\S*)$/);
    if (mt) { setQ(mt[1]); setActive(0); setOpen(true); } else setOpen(false);
  }
  function pick(m: Member) {
    const el = ref.current; if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const upto = value.slice(0, caret).replace(/@(\S*)$/, `@${m.name} `);
    onChange(upto + value.slice(caret));
    setOpen(false);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(upto.length, upto.length); });
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open && matches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[active]); return; }
      if (e.key === "Escape") { setOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
  }

  return (
    <div className="mention-wrap">
      {open && matches.length > 0 && (
        <div className="mention-menu">
          {matches.map((m, i) => (
            <button type="button" key={m.id} className={`mention-opt${i === active ? " active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); pick(m); }}>
              <Avatar name={m.name} url={m.avatar_url} color={m.avatar_color} size={22} />{m.name}
            </button>
          ))}
        </div>
      )}
      <input ref={ref} value={value} placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); refresh(e.target.value, e.target.selectionStart ?? e.target.value.length); }}
        onKeyDown={onKeyDown} onBlur={() => setTimeout(() => setOpen(false), 120)} />
    </div>
  );
}
