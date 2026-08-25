"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Member } from "@/lib/types";

export default function TeamManager() {
  if (!isSupabaseConfigured())
    return <div className="card"><div className="empty"><h4>Connect Supabase</h4><p className="muted">Your team lives in the cloud database.</p></div></div>;
  return <TeamInner />;
}

function TeamInner() {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("members").select("*").order("created_at");
    if (error) { if (/column|does not exist/i.test(error.message)) setSetup(true); setLoading(false); return; }
    setMembers(data as Member[]); setLoading(false);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("team").on("postgres_changes", { event: "*", schema: "public", table: "members" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase]);

  async function add() {
    const n = name.trim(), e = email.trim();
    if (!n) return setMsg({ t: "err", m: "Name is required." });
    if (!e || !/^\S+@\S+\.\S+$/.test(e)) return setMsg({ t: "err", m: "A valid email is required." });
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("members").insert({ name: n, email: e });
    if (error) { setBusy(false); return setMsg({ t: "err", m: error.message.includes("duplicate") ? "That email is already on the team." : error.message }); }
    // try to send an invite email
    let invited = false, reason = "";
    try {
      const res = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) });
      const j = await res.json(); invited = j.ok; reason = j.reason ?? "";
    } catch { /* ignore */ }
    setBusy(false); setName(""); setEmail("");
    setMsg(invited
      ? { t: "ok", m: `${n} added and invite sent to ${e}.` }
      : { t: "ok", m: `${n} added.${reason === "not_configured" ? " (Email invites turn on once the service key is set.)" : ""}` });
    load();
  }

  async function resend(e: string | null) {
    if (!e) return;
    const res = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) });
    const j = await res.json();
    setMsg(j.ok ? { t: "ok", m: `Invite re-sent to ${e}.` } : { t: "err", m: j.reason === "not_configured" ? "Email invites need the service key set up first." : `Could not send: ${j.reason}` });
  }
  async function saveEdit(id: string) {
    if (!eName.trim()) return;
    await supabase.from("members").update({ name: eName.trim(), email: eEmail.trim() || null }).eq("id", id);
    setEditId(null); load();
  }
  async function remove(m: Member) {
    if (!confirm(`Remove ${m.name} from the team?`)) return;
    await supabase.from("members").delete().eq("id", m.id); load();
  }
  async function toggleActive(m: Member) {
    await supabase.from("members").update({ active: !(m.active !== false) }).eq("id", m.id); load();
  }

  if (setup) return <div className="card"><div className="empty"><h4>Run the latest setup SQL</h4><p className="muted">The team needs the members-table update (supabase/upgrade-v4.sql).</p></div></div>;
  if (loading) return <div className="card"><div className="empty"><p className="muted">Loading…</p></div></div>;

  return (
    <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", alignItems: "start" }}>
      <div className="card">
        <h3>Members · {members.length}</h3>
        {members.map((m) => (
          <div className="team-row" key={m.id}>
            <Avatar name={m.name} url={m.avatar_url} color={m.avatar_color} size={40} />
            {editId === m.id ? (
              <div className="team-edit">
                <input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Name" />
                <input value={eEmail} onChange={(e) => setEEmail(e.target.value)} placeholder="Email" />
              </div>
            ) : (
              <div className="team-info">
                <b>{m.name} {m.active === false && <span className="tag2">inactive</span>} {m.user_id && <span className="tag2">joined</span>}</b>
                <span>{m.email ?? "no email"}</span>
              </div>
            )}
            <div className="team-actions">
              {editId === m.id ? (
                <>
                  <button className="btn btn-sm" onClick={() => saveEdit(m.id)}>Save</button>
                  <button className="btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  {m.email && !m.user_id && <button className="icon-mini" title="Resend invite" onClick={() => resend(m.email)}><Icon name="mail" size={16} /></button>}
                  <button className="icon-mini" title="Edit" onClick={() => { setEditId(m.id); setEName(m.name); setEEmail(m.email ?? ""); }}><Icon name="settings" size={16} /></button>
                  <button className="icon-mini" title={m.active === false ? "Reactivate" : "Deactivate"} onClick={() => toggleActive(m)}><Icon name={m.active === false ? "check" : "clock"} size={16} /></button>
                  <button className="icon-mini danger" title="Remove" onClick={() => remove(m)}><Icon name="trash" size={16} /></button>
                </>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="muted" style={{ padding: "10px 0" }}>No members yet — add your first below.</p>}
      </div>

      <div className="card">
        <h3>Add a member</h3>
        {msg && <div className={`form-msg ${msg.t}`}>{msg.m}</div>}
        <div className="field"><label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Doe" /></div>
        <div className="field"><label>Email <span className="req">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@agency.com" onKeyDown={(e) => e.key === "Enter" && add()} /></div>
        <button className="btn btn-block" disabled={busy} onClick={add}>{busy ? "Adding…" : "Add & invite"}</button>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>An invite email lets them set a password and join. They’ll appear here as “joined” once they sign in.</p>
      </div>
    </div>
  );
}
