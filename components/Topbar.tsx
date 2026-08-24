"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function Topbar({
  email,
  preview,
}: {
  email: string;
  preview: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    if (isSupabaseConfigured()) await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const name = preview ? "Preview user" : email.split("@")[0];
  const initial = (name[0] ?? "?").toUpperCase();

  return (
    <div className="appbar">
      <label className="search">
        <Icon name="search" size={18} />
        <input placeholder="Search for anything…" />
      </label>

      <div className="appbar-actions">
        <button className="icon-btn" aria-label="Messages">
          <Icon name="mail" size={19} />
          <span className="badge" />
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <Icon name="bell" size={19} />
          <span className="badge" />
        </button>

        <div className="user" ref={ref} onClick={() => setMenuOpen((o) => !o)}>
          <div className="who">
            <b>{name}</b>
            <span>{preview ? "Preview mode" : "Team member"}</span>
          </div>
          <div className="av">{initial}</div>
          <Icon name="chevron" size={16} />

          {menuOpen && (
            <div className="user-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={signOut}>
                <Icon name="logout" size={17} />
                {preview ? "Back to login" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
