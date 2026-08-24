import { createClient, isSupabaseConfigured } from "./supabase/server";

export type AppUser = {
  email: string;
  /** true when running without Supabase keys (local preview, single machine). */
  preview: boolean;
};

/**
 * Returns the current user.
 * - Preview mode (no Supabase keys): always returns a placeholder user so the
 *   whole dashboard is browsable locally.
 * - Cloud mode (keys set): returns the real signed-in user, or null if none.
 */
export async function getUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) {
    return { email: "preview@local", preview: true };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { email: user.email ?? "member", preview: false };
}
