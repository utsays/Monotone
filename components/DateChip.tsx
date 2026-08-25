"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const POP_W = 232;
const POP_H = 300;
const GAP = 6;
/** Place the popover anchored to the trigger, flipping above when there's no room below. */
function computePos(btn: HTMLElement) {
  const r = btn.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom;
  const top = spaceBelow < POP_H + GAP && r.top > spaceBelow
    ? Math.max(GAP, r.top - POP_H - GAP)          // flip above
    : r.bottom + GAP;                              // default: below
  const left = Math.max(GAP, Math.min(r.left, window.innerWidth - POP_W - GAP));
  return { top, left };
}
export function fmtShort(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()} ${dt.toLocaleDateString(undefined, { month: "short" })}`;
}

export default function DateChip({
  value, onChange, placeholder = "Set date", className = "", overdue = false, allowClear = true, stopDrag = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  className?: string;
  overdue?: boolean;
  allowClear?: boolean;
  stopDrag?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [cursor, setCursor] = useState(() => {
    const base = value ? new Date(value + "T00:00:00") : new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reposition on scroll/resize so the popover stays anchored to its chip.
  useEffect(() => {
    if (!open) return;
    const reposition = () => btnRef.current && setPos(computePos(btnRef.current));
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      setPos(computePos(btnRef.current));
      if (value) { const b = new Date(value + "T00:00:00"); setCursor({ y: b.getFullYear(), m: b.getMonth() }); }
    }
    setOpen((o) => !o);
  }

  const first = new Date(cursor.y, cursor.m, 1);
  const start = new Date(cursor.y, cursor.m, 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const todayIso = iso(new Date());

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`date-chip${value ? "" : " empty"}${overdue ? " over" : ""} ${className}`}
        onClick={toggle}
        onPointerDown={stopDrag ? (e) => e.stopPropagation() : undefined}
      >
        {value ? fmtShort(value) : placeholder}
      </button>

      {open && createPortal(
        <div ref={popRef} className="date-pop" style={{ top: pos.top, left: pos.left, width: POP_W }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <div className="date-pop-head">
            <button className="nav-b sm" onClick={() => setCursor((c) => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}><Icon name="chevronLeft" size={15} /></button>
            <b>{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b>
            <button className="nav-b sm" onClick={() => setCursor((c) => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}><Icon name="chevronRight" size={15} /></button>
          </div>
          <div className="date-grid">
            {DOW.map((d, i) => <span key={i} className="dg-dow">{d}</span>)}
            {cells.map((d, i) => {
              const ds = iso(d);
              const inM = d.getMonth() === cursor.m;
              return (
                <button key={i} className={`dg-cell${inM ? "" : " out"}${ds === value ? " sel" : ""}${ds === todayIso ? " today" : ""}`}
                  onClick={() => { onChange(ds); setOpen(false); }}>{d.getDate()}</button>
              );
            })}
          </div>
          {allowClear && value && <button className="date-clear" onClick={() => { onChange(null); setOpen(false); }}>Clear</button>}
        </div>,
        document.body
      )}
    </>
  );
}
