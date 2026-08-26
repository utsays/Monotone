import { createBrowserClient } from "@supabase/ssr";

/** True once the two Supabase env vars are set (i.e. real cloud mode). */
export function isSupabaseConfigured(): boolean {
  // Local-only escape hatch: force preview (no-auth) mode during development.
  // Hard-gated to non-production so it can never disable auth on the deployed app.
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FORCE_PREVIEW === "1") {
    return false;
  }
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Browser-side Supabase client. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
