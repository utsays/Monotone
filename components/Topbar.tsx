"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import Avatar from "./Avatar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Result = { id: string; title: string; project_id: string; section_id: string | null };

export default function Topbar({ email, preview }: { email: string; preview: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => (isSupabaseConfigured() ? createClient() : null), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [projNames, setProjNames] = useState<Record<string, string>>({});
  const [me, setMe] = useState<{ name: string; avatar_url: string | null; avatar_color: string | null } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("projects").select("id,name").then(({ data }) => {
      if (data) setProjNames(Object.fromEntries(data.map((p) => [p.id, p.name])));
    });
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    async function loadMe() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;
      const { data } = await supabase!.from("members").select("name,avatar_url,avatar_color").eq("user_id", user.id).maybeSingle();
      if (data) setMe(data as typeof me);
    }
    loadMe();
    const ch = supabase.channel("me-topbar").on("postgres_changes", { event: "*", schema: "public", table: "members" }, loadMe).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || q.trim().length < 1) { setResults([]); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      const { data } = await supabase.from("tasks").select("id,title,project_id,section_id").ilike("title", `%${q.trim()}%`).limit(8);
      if (!cancel) setResults((data ?? []) as Result[]);
    }, 180);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, supabase]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.push("/login"); router.refresh();
  }
  function goTo(r: Result) {
    setSearchOpen(false); setQ("");
    router.push(`/operations?project=${r.project_id}&task=${r.id}`);
  }

  const name = me?.name || (preview ? "Preview user" : email.split("@")[0]);

  return (
    <div className="appbar">
      <div className="search" ref={searchRef}>
        <Icon name="search" size={18} />
        <input placeholder="Search tasks…" value={q} onFocus={() => setSearchOpen(true)} onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }} />
        <span className="kbd">⌘F</span>
        {searchOpen && q.trim() && (
          <div className="search-results">
            {results.length === 0 ? <div className="sr-empty">No tasks match “{q.trim()}”.</div> : results.map((r) => (
              <div key={r.id} className="sr-item" onClick={() => goTo(r)}>
                <Icon name="check" size={14} />
                <span className="sr-title">{r.title}</span>
                <span className="sr-proj">{projNames[r.project_id] ?? ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="appbar-actions">
        <div ref={bellRef} style={{ position: "relative" }}>
          <button className="icon-btn" aria-label="Notifications" onClick={() => setBellOpen((o) => !o)}>
            <Icon name="bell" size={19} />
          </button>
          {bellOpen && (
            <div className="user-menu" style={{ width: 240, padding: 14 }}>
              <b style={{ fontSize: 13 }}>Notifications</b>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>You’re all caught up. Activity from your team will show here.</p>
            </div>
          )}
        </div>

        <div className="user" ref={ref} onClick={() => setMenuOpen((o) => !o)}>
          <div className="who">
            <b>{name}</b>
            <span>{preview ? "Preview mode" : email}</span>
          </div>
          <Avatar name={name} url={me?.avatar_url} color={me?.avatar_color} size={40} />
          <Icon name="chevron" size={16} />
          {menuOpen && (
            <div className="user-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setMenuOpen(false); router.push("/settings"); }}><Icon name="settings" size={17} /> Settings</button>
              <button onClick={() => { setMenuOpen(false); router.push("/team"); }}><Icon name="users" size={17} /> Team</button>
              <button onClick={signOut}><Icon name="logout" size={17} /> {preview ? "Back to login" : "Sign out"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
