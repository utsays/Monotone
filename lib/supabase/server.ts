import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

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

/** Server-side Supabase client bound to the request cookies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — safe to ignore, middleware refreshes
          }
        },
      },
    }
  );
}
