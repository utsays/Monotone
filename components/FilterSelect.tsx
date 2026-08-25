"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

export type FilterOption = { value: string; label: string; color?: string };

const MENU_MIN_W = 200;

/**
 * Themed replacement for a native <select> filter.
 * Always works in terms of a string[] value: single-select uses length 0/1,
 * multi-select toggles entries. Rendered through a portal so it can never be
 * clipped by the board's horizontal scroll container.
 */
export default function FilterSelect({
  label, options, value, onChange, multi = false, icon,
}: {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: MENU_MIN_W });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current;
      if (!b) return;
      const r = b.getBoundingClientRect();
      const width = Math.max(r.width, MENU_MIN_W);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const top = Math.min(r.bottom + 6, window.innerHeight - 60);
      setPos({ top, left, width });
    };
    place();
    const onDoc = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function pick(v: string) {
    if (multi) {
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    } else {
      onChange(value[0] === v ? [] : [v]);
      setOpen(false);
    }
  }

  const active = value.length > 0;
  const summary =
    !active ? label
      : multi ? `${label} · ${value.length}`
        : options.find((o) => o.value === value[0])?.label ?? label;

  return (
    <>
      <button ref={btnRef} type="button" className={`filter-select${active ? " on" : ""}`} onClick={() => setOpen((o) => !o)}>
        {icon && <Icon name={icon} size={15} />}
        <span className="fs-text">{summary}</span>
        <Icon name="chevron" size={14} className={`fs-caret${open ? " up" : ""}`} />
      </button>

      {open && createPortal(
        <div ref={popRef} className="filter-menu" style={{ top: pos.top, left: pos.left, minWidth: pos.width }}>
          {!multi && (
            <button className={`fm-item${!active ? " sel" : ""}`} onClick={() => { onChange([]); setOpen(false); }}>
              <span className="fm-check">{!active && <Icon name="tick" size={13} strokeWidth={3} />}</span>
              <span className="fm-label">{label}</span>
            </button>
          )}
          {options.length === 0 && <div className="fm-empty">Nothing to filter yet</div>}
          {options.map((o) => {
            const on = value.includes(o.value);
            return (
              <button key={o.value} className={`fm-item${on ? " sel" : ""}`} onClick={() => pick(o.value)}>
                <span className={`fm-check${multi ? " box" : ""}${on ? " on" : ""}`}>{on && <Icon name="tick" size={13} strokeWidth={3} />}</span>
                {o.color && <span className="fm-dot" style={{ background: o.color }} />}
                <span className="fm-label">{o.label}</span>
              </button>
            );
          })}
          {multi && active && <button className="fm-clear" onClick={() => onChange([])}>Clear selection</button>}
        </div>,
        document.body,
      )}
    </>
  );
}
