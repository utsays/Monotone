"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import Logo from "./Logo";

const MENU = [
  { href: "/overview", label: "Dashboard", icon: "grid" },
  { href: "/operations", label: "Tasks", icon: "box" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/team", label: "Team", icon: "users" },
];
const GENERAL = [
  { href: "/finance", label: "Finance", icon: "wallet" },
  { href: "/crm", label: "CRM", icon: "briefcase" },
  { href: "/strategy", label: "Strategy", icon: "target" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const item = (n: { href: string; label: string; icon: string; badge?: string }) => {
    const active = pathname === n.href;
    return (
      <Link key={n.href} href={n.href} className={`nav-item${active ? " active" : ""}`} onClick={() => setOpen(false)}>
        <Icon name={n.icon} strokeWidth={active ? 2.3 : 2} />
        {n.label}
        {n.badge && <span className="nbadge">{n.badge}</span>}
      </Link>
    );
  };

  return (
    <>
      <button className="menu-btn" style={{ position: "fixed", top: 16, left: 16, zIndex: 80 }} onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
        <Icon name="grid" size={20} />
      </button>

      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="brand">
          <span className="logo"><Logo size={22} /></span>
          Monotone
        </div>

        <div className="nav-label">Menu</div>
        {MENU.map(item)}
        <div className="nav-label">General</div>
        {GENERAL.map(item)}

        <div className="nav-spacer" />
      </aside>
    </>
  );
}
