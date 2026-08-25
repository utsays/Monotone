import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient as createServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  // must be a signed-in team member to invite
  const supa = await createServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ ok: false, reason: "not_configured" });

  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ ok: false, reason: "no_email" }, { status: 400 });

  const admin = createAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const redirectTo = new URL("/login", req.url).toString();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
