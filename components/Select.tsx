"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

export type SelectOption = { value: string; label: string; color?: string };

/**
 * Themed single-select. Native <select> opens an unthemeable OS popup, so this
 * renders its own menu (portaled to <body> to escape card transforms / scroll
 * clipping). Variants: "inline" (compact, for cards & rows) and "field" (modal).
 */
export default function Select({
  value, options, onChange, variant = "field", ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  variant?: "inline" | "field";
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current; if (!b) return;
      const r = b.getBoundingClientRect();
      const width = Math.max(r.width, 180);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const belowH = window.innerHeight - r.bottom;
      const top = belowH < 240 && r.top > belowH ? Math.max(8, r.top - Math.min(240, options.length * 38 + 16) - 6) : r.bottom + 6;
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
  }, [open, options.length]);

  return (
    <>
      <button ref={btnRef} type="button" aria-label={ariaLabel} className={`tsel tsel-${variant}${open ? " open" : ""}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        {current?.color && <span className="tsel-dot" style={{ background: current.color }} />}
        <span className="tsel-text">{current?.label ?? "Select"}</span>
        <Icon name="chevron" size={variant === "inline" ? 13 : 15} className={`tsel-caret${open ? " up" : ""}`} />
      </button>

      {open && createPortal(
        <div ref={popRef} className="tsel-menu" style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          onPointerDown={(e) => e.stopPropagation()}>
          {options.map((o) => (
            <button key={o.value} type="button" className={`tsel-item${o.value === value ? " sel" : ""}`}
              onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false); }}>
              <span className="tsel-check">{o.value === value && <Icon name="tick" size={13} strokeWidth={3} />}</span>
              {o.color && <span className="tsel-dot" style={{ background: o.color }} />}
              <span className="tsel-label">{o.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
