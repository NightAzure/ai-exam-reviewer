-- Phase 4: support draft attempt autosave and resume safely.

create unique index if not exists idx_assessment_attempts_single_in_progress
  on public.assessment_attempts(assessment_id, student_id)
  where status = 'in_progress';

drop policy if exists "assessment_attempt_answers_update_owner_member" on public.assessment_attempt_answers;
create policy "assessment_attempt_answers_update_owner_member"
on public.assessment_attempt_answers
for update
to authenticated
using (
  exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.id = attempt_id
      and aa.student_id = (select auth.uid())
      and public.is_course_member(a.course_id, (select auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.id = attempt_id
      and aa.student_id = (select auth.uid())
      and public.is_course_member(a.course_id, (select auth.uid()))
  )
);

drop policy if exists "assessment_attempt_answers_delete_owner_member" on public.assessment_attempt_answers;
create policy "assessment_attempt_answers_delete_owner_member"
on public.assessment_attempt_answers
for delete
to authenticated
using (
  exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.id = attempt_id
      and aa.student_id = (select auth.uid())
      and public.is_course_member(a.course_id, (select auth.uid()))
  )
);
