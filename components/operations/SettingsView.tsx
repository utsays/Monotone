"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Member } from "@/lib/types";

export default function SettingsView() {
  if (!isSupabaseConfigured())
    return <div className="card"><div className="empty"><h4>Connect Supabase</h4><p className="muted">Account settings need the cloud database.</p></div></div>;
  return <SettingsInner />;
}

function SettingsInner() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [emailAddr, setEmailAddr] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ where: string; t: "ok" | "err"; m: string } | null>(null);

  // 2FA
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string } | null>(null);
  const [code, setCode] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUid(user.id); setEmailAddr(user.email ?? "");
    const { data } = await supabase.from("members").select("*").eq("user_id", user.id).maybeSingle();
    if (data) { setMe(data as Member); setName((data as Member).name); }
    const { data: f } = await supabase.auth.mfa.listFactors();
    const verified = f?.totp?.find((x) => x.status === "verified");
    setFactorId(verified?.id ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, [supabase]);

  async function saveProfile() {
    if (!me) return;
    await supabase.from("members").update({ name: name.trim() || me.name }).eq("id", me.id);
    setMsg({ where: "profile", t: "ok", m: "Profile saved." }); load();
  }
  async function uploadAvatar(file: File) {
    if (!uid || !me) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return setMsg({ where: "profile", t: "err", m: `Upload failed: ${error.message}. (Run upgrade-v4.sql to create the avatars bucket.)` });
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("members").update({ avatar_url: data.publicUrl }).eq("id", me.id);
    setMsg({ where: "profile", t: "ok", m: "Photo updated." }); load();
  }
  async function changePassword() {
    if (pw.length < 6) return setMsg({ where: "pw", t: "err", m: "Password must be at least 6 characters." });
    if (pw !== pw2) return setMsg({ where: "pw", t: "err", m: "Passwords don’t match." });
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg({ where: "pw", t: "err", m: error.message });
    setPw(""); setPw2(""); setMsg({ where: "pw", t: "ok", m: "Password changed." });
  }
  async function startEnroll() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) return setMsg({ where: "2fa", t: "err", m: error.message });
    setEnroll({ id: data.id, qr: data.totp.qr_code });
  }
  async function verifyEnroll() {
    if (!enroll) return;
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    if (e1) return setMsg({ where: "2fa", t: "err", m: e1.message });
    const { error } = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code });
    if (error) return setMsg({ where: "2fa", t: "err", m: error.message });
    setEnroll(null); setCode(""); setMsg({ where: "2fa", t: "ok", m: "Two-factor enabled." }); load();
  }
  async function disable2fa() {
    if (!factorId) return;
    await supabase.auth.mfa.unenroll({ factorId });
    setMsg({ where: "2fa", t: "ok", m: "Two-factor disabled." }); load();
  }
  async function deactivate() {
    if (!me || !confirm("Deactivate your account? You’ll be hidden from assignees.")) return;
    await supabase.from("members").update({ active: false }).eq("id", me.id);
    setMsg({ where: "danger", t: "ok", m: "Account deactivated." }); load();
  }
  async function deleteAccount() {
    if (!confirm("Permanently delete your account and sign-in? This cannot be undone.")) return;
    const res = await fetch("/api/account/delete", { method: "POST" });
    const j = await res.json();
    if (!j.ok) return setMsg({ where: "danger", t: "err", m: j.reason === "not_configured" ? "Account deletion needs the service key set up first." : `Failed: ${j.reason}` });
    await supabase.auth.signOut(); router.push("/login");
  }

  if (loading) return <div className="card"><div className="empty"><p className="muted">Loading…</p></div></div>;

  return (
    <div className="settings-grid">
      {/* Profile */}
      <div className="card">
        <h3>Profile</h3>
        {msg?.where === "profile" && <div className={`form-msg ${msg.t}`}>{msg.m}</div>}
        <div className="profile-head">
          <Avatar name={name || "?"} url={me?.avatar_url} color={me?.avatar_color} size={64} />
          <div>
            <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Icon name="camera" size={15} /> Change photo</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>
        </div>
        <div className="field"><label>Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Email</label>
          <input value={emailAddr} disabled /></div>
        <button className="btn btn-sm" onClick={saveProfile}>Save profile</button>
      </div>

      {/* Password */}
      <div className="card">
        <h3>Password</h3>
        {msg?.where === "pw" && <div className={`form-msg ${msg.t}`}>{msg.m}</div>}
        <div className="field"><label>New password</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" /></div>
        <div className="field"><label>Confirm password</label>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" /></div>
        <button className="btn btn-sm" onClick={changePassword}>Update password</button>
      </div>

      {/* 2FA */}
      <div className="card">
        <h3>Two-factor authentication</h3>
        {msg?.where === "2fa" && <div className={`form-msg ${msg.t}`}>{msg.m}</div>}
        {factorId ? (
          <>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}><Icon name="shield" size={15} /> Two-factor is <b>on</b> for your account.</p>
            <button className="btn-ghost btn-sm" onClick={disable2fa}>Disable 2FA</button>
          </>
        ) : enroll ? (
          <>
            <p className="muted" style={{ fontSize: 13 }}>Scan this with your authenticator app, then enter the 6-digit code.</p>
            <div className="qr-box" dangerouslySetInnerHTML={{ __html: enroll.qr }} />
            <div className="field"><label>6-digit code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" onClick={verifyEnroll}>Verify & enable</button>
              <button className="btn-ghost btn-sm" onClick={() => setEnroll(null)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Add a second step at sign-in with an authenticator app.</p>
            <button className="btn btn-sm" onClick={startEnroll}><Icon name="key" size={15} /> Set up 2FA</button>
          </>
        )}
      </div>

      {/* Danger zone */}
      <div className="card danger-zone">
        <h3>Danger zone</h3>
        {msg?.where === "danger" && <div className={`form-msg ${msg.t}`}>{msg.m}</div>}
        <div className="danger-row">
          <div><b>Deactivate account</b><p className="muted">Hide yourself from assignees; you can reactivate later.</p></div>
          <button className="btn-ghost btn-sm" onClick={deactivate}>Deactivate</button>
        </div>
        <div className="danger-row">
          <div><b>Delete account</b><p className="muted">Permanently remove your account and sign-in.</p></div>
          <button className="btn-danger btn-sm" onClick={deleteAccount}>Delete</button>
        </div>
      </div>
    </div>
  );
}
