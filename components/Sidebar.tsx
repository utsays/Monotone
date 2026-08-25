"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import Logo from "./Logo";

const NAV = [
  { href: "/overview", label: "Overview", icon: "grid" },
  { href: "/operations", label: "Tasks", icon: "box" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/team", label: "Team", icon: "users" },
  { href: "/finance", label: "Finance", icon: "wallet" },
  { href: "/crm", label: "CRM", icon: "briefcase" },
  { href: "/strategy", label: "Strategy", icon: "target" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="menu-btn" style={{ position: "fixed", top: 16, left: 16, zIndex: 80 }} onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
        <Icon name="grid" size={20} />
      </button>

      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="brand">
          <span className="logo"><Logo size={19} /></span>
          Monotone
        </div>

        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href} className={`nav-item${active ? " active" : ""}`} onClick={() => setOpen(false)}>
              <Icon name={n.icon} strokeWidth={active ? 2 : 1.8} />
              {n.label}
            </Link>
          );
        })}

        <div className="nav-spacer" />

        <Link href="/settings" className={`nav-item${pathname === "/settings" ? " active" : ""}`} onClick={() => setOpen(false)}>
          <Icon name="settings" strokeWidth={pathname === "/settings" ? 2 : 1.8} />
          Settings
        </Link>
      </aside>
    </>
  );
}
