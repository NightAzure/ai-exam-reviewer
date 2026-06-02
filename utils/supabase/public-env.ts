/** Project ref from `https://<ref>.supabase.co` */
function projectRefFromUrl(supabaseUrl: string): string | null {
  try {
    const { hostname } = new URL(supabaseUrl);
    const m = /^([a-z0-9-]+)\.supabase\.co$/i.exec(hostname);
    return m?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** `ref` claim from Supabase anon JWT (no signature verification). */
function projectRefFromAnonJwt(anonKey: string): string | null {
  if (!anonKey.startsWith("eyJ")) return null;
  try {
    const payload = anonKey.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    if (typeof atob === "undefined") return null;
    const json = atob(base64 + pad);
    const ref = JSON.parse(json).ref;
    return typeof ref === "string" ? ref.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Public URL + key for browser and SSR Supabase clients. */
export function getPublicSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url) return null;

  const urlRef = projectRefFromUrl(url);
  const anonRef = anon ? projectRefFromAnonJwt(anon) : null;
  const anonMismatchesUrl = Boolean(
    urlRef && anonRef && anon && anonRef !== urlRef,
  );

  let key: string | undefined;

  if (anonMismatchesUrl && publishable) {
    console.warn(
      `[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is for project "${anonRef}" but NEXT_PUBLIC_SUPABASE_URL is "${urlRef}". Using NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY so auth matches the URL.`,
    );
    key = publishable;
  } else if (anonMismatchesUrl && !publishable) {
    console.error(
      `[Supabase] Anon key is for project "${anonRef}" but URL is project "${urlRef}". Fix .env: use the anon key from the same dashboard project as the URL, or add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for "${urlRef}".`,
    );
    key = anon;
  } else {
    key = anon ?? publishable;
  }

  if (!key) return null;
  return { url, key };
}
