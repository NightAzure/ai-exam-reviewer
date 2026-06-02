import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";

const ensureProfile = async (user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) => {
  const metadata = user.user_metadata ?? {};
  const firstName =
    (typeof metadata.first_name === "string" && metadata.first_name.trim()) ||
    "";
  const secondName =
    (typeof metadata.second_name === "string" && metadata.second_name.trim()) ||
    "";
  const username =
    user.email?.split("@")[0] ||
    `${firstName}${secondName}`.replace(/\s+/g, "").toLowerCase() ||
    user.id.slice(0, 8);

  await adminSupabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      first_name: firstName,
      second_name: secondName,
      role: "student",
    },
    { onConflict: "id" },
  );
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, origin));
  }

  if (data.user) {
    await ensureProfile({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    });
  }

  return NextResponse.redirect(new URL(next, origin));
}
