-- ============================================================
-- Security fixes migration
-- Addresses: privilege escalation, mutable search_path,
-- public-role policies, missing RLS policies, stale enum refs,
-- and assessment score manipulation.
-- ============================================================

-- ============================================================
-- 1. Fix mutable search_path on all security-relevant functions
--    (prevents search_path injection attacks)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.role::text = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_editor(_course_id bigint, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = _course_id AND c.instructor_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.course_staff cs
    WHERE cs.course_id = _course_id AND cs.user_id = _user_id
  )
  OR public.is_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_course_member(_course_id bigint, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = _course_id
      AND e.student_id = _user_id
      AND e.status = 'active'  -- 'approved'/'enrolled' are not valid enum values
  )
  OR public.is_course_editor(_course_id, _user_id);
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_assessment_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_chat_threads_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_question_bank_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user is SECURITY DEFINER (correct for auth trigger),
-- but also needs a fixed search_path since it runs with elevated privileges.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, second_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'second_name',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. CRITICAL: Fix profiles UPDATE policy (prevent role self-escalation)
--    Without WITH CHECK, any user could set role = 'admin' on themselves.
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK (
  (SELECT auth.uid()) = id
  -- Role cannot be changed via client; only the service role (admin API) may change roles.
  AND role = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
);

-- Fix remaining profiles policies to require authentication (not public/anon)
DROP POLICY IF EXISTS "User profiles are viewable by their own." ON public.profiles;
CREATE POLICY "User profiles are viewable by their own."
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- 3. Courses table: remove legacy public-role policies and fix
--    stale enrollment status values ('approved', 'enrolled' don't exist)
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
DROP POLICY IF EXISTS "Students can view active courses" ON public.courses;

-- Recreate the SELECT policy with correct status enum value ('active' only)
DROP POLICY IF EXISTS "courses_select_member_or_admin" ON public.courses;
CREATE POLICY "courses_select_member_or_admin"
ON public.courses
FOR SELECT
TO authenticated
USING (
  instructor_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = courses.id
      AND e.student_id = auth.uid()
      AND e.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.course_staff cs
    WHERE cs.course_id = courses.id
      AND cs.user_id = auth.uid()
  )
);

-- ============================================================
-- 4. Enrollments: restrict view-own-enrollment to authenticated users
-- ============================================================

DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- 5. Assessment attempts: prevent students from modifying submitted
--    attempts or setting score/correct_answers directly.
--    Scoring is done server-side via the service role (bypasses RLS).
-- ============================================================

DROP POLICY IF EXISTS "assessment_attempts_update_owner_or_editor" ON public.assessment_attempts;

-- Students may only update their own attempt while it is still in progress,
-- and may not set the score field (score is computed and written by the service role).
DROP POLICY IF EXISTS "assessment_attempts_update_student" ON public.assessment_attempts;
CREATE POLICY "assessment_attempts_update_student"
ON public.assessment_attempts
FOR UPDATE
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND status = 'in_progress'
)
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND score IS NULL  -- score must remain null; service role sets it after grading
);

-- Instructors / TAs / admins can update any attempt in their course
-- (e.g. to override a score or mark as abandoned)
DROP POLICY IF EXISTS "assessment_attempts_update_editor" ON public.assessment_attempts;
CREATE POLICY "assessment_attempts_update_editor"
ON public.assessment_attempts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_attempts.assessment_id
      AND public.is_course_editor(a.course_id, (SELECT auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_attempts.assessment_id
      AND public.is_course_editor(a.course_id, (SELECT auth.uid()))
  )
);

-- ============================================================
-- 6. Add missing RLS policies for question_bank and topics
-- ============================================================

-- question_bank: students must NOT access the bank directly
-- (they receive questions through assessment_questions, which is already protected).
-- Admins have full access; instructors can read and manage their own questions.
DROP POLICY IF EXISTS "question_bank_select_instructor_or_admin" ON public.question_bank;
CREATE POLICY "question_bank_select_instructor_or_admin"
ON public.question_bank
FOR SELECT
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text = 'instructor'
  )
);

DROP POLICY IF EXISTS "question_bank_insert_instructor_or_admin" ON public.question_bank;
CREATE POLICY "question_bank_insert_instructor_or_admin"
ON public.question_bank
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin((SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role::text = 'instructor'
  )
);

DROP POLICY IF EXISTS "question_bank_update_owner_or_admin" ON public.question_bank;
CREATE POLICY "question_bank_update_owner_or_admin"
ON public.question_bank
FOR UPDATE
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  OR created_by = (SELECT auth.uid())
)
WITH CHECK (
  public.is_admin((SELECT auth.uid()))
  OR created_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "question_bank_delete_owner_or_admin" ON public.question_bank;
CREATE POLICY "question_bank_delete_owner_or_admin"
ON public.question_bank
FOR DELETE
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  OR created_by = (SELECT auth.uid())
);

-- topics: course members can view; course editors can manage
DROP POLICY IF EXISTS "topics_select_course_member" ON public.topics;
CREATE POLICY "topics_select_course_member"
ON public.topics
FOR SELECT
TO authenticated
USING (public.is_course_member(course_id::bigint, (SELECT auth.uid())));

DROP POLICY IF EXISTS "topics_manage_course_editor" ON public.topics;
CREATE POLICY "topics_manage_course_editor"
ON public.topics
FOR ALL
TO authenticated
USING (public.is_course_editor(course_id::bigint, (SELECT auth.uid())))
WITH CHECK (public.is_course_editor(course_id::bigint, (SELECT auth.uid())));
