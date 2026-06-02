import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { isValidThumbnailUrl } from "@/utils/validation/thumbnail";

const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_CODE_GENERATION_ATTEMPTS = 12;

type CreateCoursePayload = {
  title?: string;
  code?: string;
  description?: string;
  thumbnail?: string | null;
};

const generateCourseCode = () => {
  let code = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARSET.length);
    code += CODE_CHARSET[randomIndex];
  }

  return code;
};

const normalizeCourseCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const resolveUniqueCourseCode = async (requestedCode?: string) => {
  const normalizedRequestedCode = requestedCode ? normalizeCourseCode(requestedCode) : "";

  if (normalizedRequestedCode) {
    const { data: conflict, error } = await adminSupabase
      .from("courses")
      .select("id")
      .eq("code", normalizedRequestedCode)
      .maybeSingle();

    if (error) throw error;
    if (conflict) {
      throw new Error("That course code is already in use.");
    }

    return normalizedRequestedCode;
  }

  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = generateCourseCode();
    const { data: conflict, error } = await adminSupabase
      .from("courses")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!conflict) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique course code.");
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["admin", "instructor"].includes(profile.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateCoursePayload;
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const thumbnail = body.thumbnail?.trim() || null;

    if (!title) {
      return NextResponse.json({ message: "Course title is required." }, { status: 400 });
    }

    if (!isValidThumbnailUrl(thumbnail)) {
      return NextResponse.json(
        { message: "Thumbnail must be an https:// URL or a valid image data URL (JPEG, PNG, GIF, WebP, AVIF)." },
        { status: 400 },
      );
    }

    const code = await resolveUniqueCourseCode(body.code);

    const { data: createdCourse, error: insertError } = await adminSupabase
      .from("courses")
      .insert({
        title,
        code,
        description,
        thumbnail_url: thumbnail,
        instructor_id: user.id,
        created_by: user.id,
        is_active: true,
        allow_self_enrollment: true,
      })
      .select("id, title, code")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      course: createdCourse,
      message: "Course created successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create course";
    return NextResponse.json({ message }, { status: 500 });
  }
}
