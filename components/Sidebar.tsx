"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const NAV = [
  { href: "/overview", label: "Overview", icon: "grid" },
  { href: "/operations", label: "Board", icon: "box" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/finance", label: "Finance", icon: "wallet" },
  { href: "/crm", label: "CRM", icon: "users" },
  { href: "/strategy", label: "Strategy", icon: "target" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="menu-btn"
        style={{ position: "fixed", top: 16, left: 16, zIndex: 80 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        <Icon name="grid" size={20} />
      </button>

      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="brand">
          <span className="logo">
            <Icon name="grid" size={18} strokeWidth={2} />
          </span>
          Agency
        </div>

        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-item${active ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <Icon name={n.icon} strokeWidth={active ? 2 : 1.8} />
              {n.label}
            </Link>
          );
        })}

        <div className="nav-spacer" />

        <div className="promo">
          <span className="go">
            <Icon name="arrowRight" size={20} strokeWidth={2} />
          </span>
          <p>Building your agency, one module at a time.</p>
        </div>
      </aside>
    </>
  );
}
