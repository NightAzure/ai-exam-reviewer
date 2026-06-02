type SupabaseSessionSource = {
  auth: {
    getSession: () => Promise<{
      data: { session: { access_token?: string } | null };
      error: unknown;
    }>;
  };
};

const TUTOR_API_KEY = process.env.TUTOR_API_KEY?.trim();

export async function buildFastApiHeaders(
  supabase: SupabaseSessionSource,
  init: Record<string, string> = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Missing Supabase session access token");
  }

  const headers: Record<string, string> = {
    ...init,
    Authorization: `Bearer ${session.access_token}`,
  };

  if (TUTOR_API_KEY) {
    headers["X-API-Key"] = TUTOR_API_KEY;
  }

  return headers;
}
