import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{1,50}$/;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

type ProfilePayload = {
  username?: string;
  first_name?: string;
  second_name?: string;
};

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProfilePayload;
    const payload: Record<string, string> = {};

    if (typeof body.username === "string") {
      const username = body.username.trim();
      if (!USERNAME_RE.test(username)) {
        return NextResponse.json(
          { message: "Username must be 3–30 characters: lowercase letters, numbers, and underscores only." },
          { status: 400 },
        );
      }
      payload.username = username;
    }

    if (typeof body.first_name === "string") {
      const firstName = body.first_name.trim();
      if (firstName && !NAME_RE.test(firstName)) {
        return NextResponse.json(
          { message: "First name may only contain letters, spaces, hyphens, and apostrophes (max 50 chars)." },
          { status: 400 },
        );
      }
      payload.first_name = firstName;
    }

    if (typeof body.second_name === "string") {
      const secondName = body.second_name.trim();
      if (secondName && !NAME_RE.test(secondName)) {
        return NextResponse.json(
          { message: "Last name may only contain letters, spaces, hyphens, and apostrophes (max 50 chars)." },
          { status: 400 },
        );
      }
      payload.second_name = secondName;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ message: "No profile changes provided" }, { status: 400 });
    }

    const { error } = await adminSupabase.from("profiles").update(payload).eq("id", user.id);
    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update profile";
    return NextResponse.json({ message }, { status: 500 });
  }
}
