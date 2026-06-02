import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "./public-env";

export function createClient() {
  const cfg = getPublicSupabaseConfig();
  if (!cfg) {
    console.warn(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.local",
    );
    return {
      auth: {
        signInWithPassword: async () => ({
          error: {
            message:
              "Supabase is not configured. Add URL and anon (or publishable) key to .env.local.",
          },
        }),
        signInWithOAuth: async () => ({
          error: { message: "Supabase is not configured." },
        }),
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
    } as ReturnType<typeof createBrowserClient>;
  }
  return createBrowserClient(cfg.url, cfg.key);
}