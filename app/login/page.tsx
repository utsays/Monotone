"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "err" | "ok"; m: string } | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMsg({ t: "err", m: error.message });
      return;
    }
    router.push("/overview");
    router.refresh();
  }

  function enterPreview() {
    router.push("/overview");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo"><Icon name="grid" size={18} strokeWidth={2} /></span>
          Agency Dashboard
        </div>
        <p className="auth-sub">
          {configured
            ? "Sign in to your team workspace."
            : "Preview mode — explore the dashboard locally."}
        </p>

        {configured ? (
          <form onSubmit={handleSignIn}>
            {msg && <div className={`form-msg ${msg.t}`}>{msg.m}</div>}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="btn btn-block" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <>
            <div className="form-msg ok">
              Supabase isn’t connected yet, so logins and shared data are off.
              You can still walk through every screen. Add your free Supabase
              keys to turn on real accounts for the team.
            </div>
            <button className="btn btn-block" onClick={enterPreview}>
              Enter dashboard (preview)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
