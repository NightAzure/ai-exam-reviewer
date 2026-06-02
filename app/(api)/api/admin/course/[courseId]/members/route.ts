import { NextResponse } from "next/server";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import type { CourseMember, CourseMemberRole } from "@/types/course-member";
import { isActiveEnrollmentStatus } from "@/utils/supabase/enrollment-statuses";

const MEMBER_ROLES = ["student", "instructor", "ta"] as const;

type ProfileRow = {
  id: string;
  username?: string | null;
  first_name?: string | null;
  second_name?: string | null;
};

type StaffRow = {
  user_id: string;
  role: Exclude<CourseMemberRole, "student">;
  assigned_at?: string | null;
};

type EnrollmentRow = {
  student_id: string;
  status?: string | null;
};

type AttemptRow = {
  student_id: string;
  status: string;
  score: number | null;
  started_at?: string | null;
  submitted_at?: string | null;
  updated_at?: string | null;
};

const isMemberRole = (value: unknown): value is CourseMemberRole => {
  return typeof value === "string" && (MEMBER_ROLES as readonly string[]).includes(value);
};

const buildName = (profile: ProfileRow | null, email: string | null, userId: string) => {
  const first = profile?.first_name?.trim() ?? "";
  const second = profile?.second_name?.trim() ?? "";
  const fullName = [first, second].filter(Boolean).join(" ").trim();

  if (fullName) return fullName;
  if (profile?.username?.trim()) return profile.username.trim();
  if (email) return email.split("@")[0];
  return `User ${userId.slice(0, 8)}`;
};

const sortMembers = (members: CourseMember[]) => {
  const roleWeight: Record<CourseMemberRole, number> = {
    instructor: 0,
    ta: 1,
    student: 2,
  };

  return [...members].sort((left, right) => {
    const roleDelta = roleWeight[left.role] - roleWeight[right.role];
    if (roleDelta !== 0) return roleDelta;
    return left.name.localeCompare(right.name);
  });
};

const requireCourseEditor = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      userId: null as string | null,
    };
  }

  const { data: isEditor, error: editorError } = await supabase.rpc("is_course_editor", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (editorError || !isEditor) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return { error: null, userId: user.id };
};

const ensureProfile = async (user: AuthUser) => {
  const metadata = user.user_metadata ?? {};
  const firstName =
    (typeof metadata.first_name === "string" && metadata.first_name.trim()) || "";
  const secondName =
    (typeof metadata.second_name === "string" && metadata.second_name.trim()) || "";
  const username =
    user.email?.split("@")[0] ||
    `${firstName}${secondName}`.replace(/\s+/g, "").toLowerCase() ||
    user.id.slice(0, 8);

  const { error } = await adminSupabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      first_name: firstName,
      second_name: secondName,
      role: "student",
    },
    { onConflict: "id" },
  );

  if (error) throw error;
};

const getEmailMapForUsers = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const results = await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data, error } = await adminSupabase.auth.admin.getUserById(userId);
      if (error || !data.user) return [userId, null] as const;
      return [userId, data.user.email ?? null] as const;
    }),
  );

  return new Map<string, string | null>(results);
};

const getProfileMapForUsers = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, ProfileRow | null>();
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, username, first_name, second_name")
    .in("id", uniqueIds);

  if (error) throw error;

  const profileMap = new Map<string, ProfileRow | null>();
  uniqueIds.forEach((userId) => profileMap.set(userId, null));
  (data ?? []).forEach((profile) => {
    profileMap.set(profile.id, profile as ProfileRow);
  });

  return profileMap;
};

const findAuthUserByEmail = async (email: string) => {
  let page = 1;
  const normalizedEmail = email.trim().toLowerCase();

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (match) return match;
    if (!data.nextPage || data.users.length === 0) return null;

    page = data.nextPage;
  }
};

const loadCourseMembers = async (courseId: number): Promise<CourseMember[]> => {
  const [
    { data: course, error: courseError },
    { data: staffRows, error: staffError },
    { data: enrollmentRows, error: enrollmentError },
    { data: assessmentIdRows, error: assessmentIdsError },
  ] = await Promise.all([
    adminSupabase
      .from("courses")
      .select("id, instructor_id, created_at")
      .eq("id", courseId)
      .single(),
    adminSupabase
      .from("course_staff")
      .select("user_id, role, assigned_at")
      .eq("course_id", courseId)
      .returns<StaffRow[]>(),
    adminSupabase
      .from("enrollments")
      .select("student_id, status")
      .eq("course_id", courseId)
      .returns<EnrollmentRow[]>(),
    adminSupabase.from("assessments").select("id").eq("course_id", courseId),
  ]);

  if (courseError) throw courseError;
  if (staffError) throw staffError;
  if (enrollmentError) throw enrollmentError;
  if (assessmentIdsError) throw assessmentIdsError;
  if (!course) throw new Error("Course not found");

  const assessmentIds = (assessmentIdRows ?? [])
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number");

  let attemptRows: AttemptRow[] = [];
  if (assessmentIds.length > 0) {
    const { data: attempts, error: attemptError } = await adminSupabase
      .from("assessment_attempts")
      .select("student_id, status, score, started_at, submitted_at, updated_at")
      .in("assessment_id", assessmentIds)
      .returns<AttemptRow[]>();

    if (attemptError) throw attemptError;
    attemptRows = attempts ?? [];
  }

  const allUserIds = [
    course.instructor_id,
    ...(staffRows ?? []).map((row) => row.user_id),
    ...(enrollmentRows ?? []).map((row) => row.student_id),
  ].filter(Boolean) as string[];

  const [emailMap, profileMap] = await Promise.all([
    getEmailMapForUsers(allUserIds),
    getProfileMapForUsers(allUserIds),
  ]);

  const attemptStats = new Map<
    string,
    { assessmentsTaken: number; totalScore: number; scoredAttempts: number; lastActiveAt: string | null }
  >();

  attemptRows.forEach((row) => {
    const current = attemptStats.get(row.student_id) ?? {
      assessmentsTaken: 0,
      totalScore: 0,
      scoredAttempts: 0,
      lastActiveAt: null,
    };

    if (row.status === "completed") {
      current.assessmentsTaken += 1;
      if (typeof row.score === "number") {
        current.totalScore += row.score;
        current.scoredAttempts += 1;
      }
    }

    const activityAt = row.submitted_at ?? row.updated_at ?? row.started_at ?? null;
    if (activityAt && (!current.lastActiveAt || activityAt > current.lastActiveAt)) {
      current.lastActiveAt = activityAt;
    }

    attemptStats.set(row.student_id, current);
  });

  const members = new Map<string, CourseMember>();

  const pushMember = (
    userId: string,
    role: CourseMemberRole,
    source: CourseMember["membershipSource"],
    joinedAt: string | null,
    isPrimaryInstructor = false,
  ) => {
    const stats = attemptStats.get(userId);
    const email = emailMap.get(userId) ?? null;
    const profile = profileMap.get(userId) ?? null;
    const averageScore =
      stats && stats.scoredAttempts > 0
        ? Math.round(stats.totalScore / stats.scoredAttempts)
        : null;

    const nextMember: CourseMember = {
      id: userId,
      userId,
      name: buildName(profile, email, userId),
      email,
      role,
      joinedAt,
      lastActiveAt: stats?.lastActiveAt ?? null,
      assessmentsTaken: stats?.assessmentsTaken ?? 0,
      averageScore,
      membershipSource: source,
      isPrimaryInstructor,
    };

    const existing = members.get(userId);
    if (!existing) {
      members.set(userId, nextMember);
      return;
    }

    const rolePriority: Record<CourseMemberRole, number> = {
      instructor: 0,
      ta: 1,
      student: 2,
    };

    if (rolePriority[nextMember.role] < rolePriority[existing.role] || nextMember.isPrimaryInstructor) {
      members.set(userId, { ...existing, ...nextMember });
      return;
    }

    members.set(userId, {
      ...existing,
      email: existing.email ?? nextMember.email,
      lastActiveAt: existing.lastActiveAt ?? nextMember.lastActiveAt,
      assessmentsTaken: Math.max(existing.assessmentsTaken, nextMember.assessmentsTaken),
      averageScore: existing.averageScore ?? nextMember.averageScore,
    });
  };

  pushMember(course.instructor_id, "instructor", "course_owner", course.created_at ?? null, true);

  (staffRows ?? []).forEach((row) => {
    pushMember(
      row.user_id,
      row.role,
      "course_staff",
      row.assigned_at ?? null,
      row.user_id === course.instructor_id,
    );
  });

  (enrollmentRows ?? []).forEach((row) => {
    if (row.status && !isActiveEnrollmentStatus(row.status)) return;
    pushMember(row.student_id, "student", "enrollment", null, false);
  });

  return sortMembers(Array.from(members.values()));
};

const syncMemberRole = async (
  courseId: number,
  userId: string,
  role: CourseMemberRole,
  actorId: string,
) => {
  const { data: course, error: courseError } = await adminSupabase
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .single();

  if (courseError) throw courseError;
  if (!course) throw new Error("Course not found");

  const isPrimaryInstructor = course.instructor_id === userId;
  if (isPrimaryInstructor && role !== "instructor") {
    throw new Error("The primary instructor cannot be demoted from this screen.");
  }

  if (role === "student") {
    await adminSupabase.from("course_staff").delete().eq("course_id", courseId).eq("user_id", userId);

    const { data: existingEnrollment, error: enrollmentLookupError } = await adminSupabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("student_id", userId)
      .maybeSingle();

    if (enrollmentLookupError) throw enrollmentLookupError;

    if (existingEnrollment) {
      const { error } = await adminSupabase
        .from("enrollments")
        .update({ status: "active" })
        .eq("course_id", courseId)
        .eq("student_id", userId);

      if (error) throw error;
      return;
    }

    const { error } = await adminSupabase.from("enrollments").insert({
      course_id: courseId,
      student_id: userId,
      status: "active",
    });

    if (error) throw error;
    return;
  }

  await adminSupabase.from("enrollments").delete().eq("course_id", courseId).eq("student_id", userId);
  await adminSupabase.from("course_staff").delete().eq("course_id", courseId).eq("user_id", userId);

  if (isPrimaryInstructor && role === "instructor") {
    return;
  }

  const { error } = await adminSupabase.from("course_staff").insert({
    course_id: courseId,
    user_id: userId,
    role,
    assigned_by: actorId,
  });

  if (error) throw error;
};

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid course id");
  }

  return parsed;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  void request;

  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const members = await loadCourseMembers(courseId);
    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load course members";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { emails?: string[]; role?: CourseMemberRole };
    const emails = Array.from(
      new Set((body.emails ?? []).map((email) => email.trim()).filter(Boolean)),
    );

    if (!isMemberRole(body.role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    if (emails.length === 0) {
      return NextResponse.json({ message: "At least one email is required" }, { status: 400 });
    }

    const warnings: string[] = [];

    for (const email of emails) {
      const authUser = await findAuthUserByEmail(email);
      if (!authUser) {
        warnings.push(`${email}: no account found. They need to sign in once before they can be added.`);
        continue;
      }

      await ensureProfile(authUser);
      await syncMemberRole(courseId, authUser.id, body.role, auth.userId);
    }

    const members = await loadCourseMembers(courseId);
    return NextResponse.json({ members, warnings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add course members";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;
    if (!auth.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { userId?: string; role?: CourseMemberRole };

    if (!body.userId || !isMemberRole(body.role)) {
      return NextResponse.json({ message: "Invalid member payload" }, { status: 400 });
    }

    await syncMemberRole(courseId, body.userId, body.role, auth.userId);
    const members = await loadCourseMembers(courseId);
    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update member";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const body = (await request.json()) as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ message: "User id is required" }, { status: 400 });
    }

    const { data: course, error: courseError } = await adminSupabase
      .from("courses")
      .select("instructor_id")
      .eq("id", courseId)
      .single();

    if (courseError) throw courseError;
    if (!course) throw new Error("Course not found");

    if (course.instructor_id === body.userId) {
      return NextResponse.json(
        { message: "The primary instructor cannot be removed from the course." },
        { status: 400 },
      );
    }

    await adminSupabase.from("course_staff").delete().eq("course_id", courseId).eq("user_id", body.userId);
    await adminSupabase.from("enrollments").delete().eq("course_id", courseId).eq("student_id", body.userId);

    const members = await loadCourseMembers(courseId);
    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove member";
    return NextResponse.json({ message }, { status: 500 });
  }
}
