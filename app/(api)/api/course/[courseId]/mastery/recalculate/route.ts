import { NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { requireCourseMember } from "@/utils/supabase/course-auth";
import { recalculateSubjectMasteryForCourse } from "@/utils/supabase/mastery";

type Params = { params: Promise<{ courseId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);
    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const auth = await requireCourseMember(courseId);
    if (auth.error) return auth.error;

    const updated = await recalculateSubjectMasteryForCourse(
      adminSupabase,
      courseId,
      auth.userId,
    );

    return NextResponse.json({ updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to recalculate mastery";
    console.error("[mastery/recalculate]", message);
    return NextResponse.json({ message: "Failed to recalculate mastery" }, { status: 500 });
  }
}
