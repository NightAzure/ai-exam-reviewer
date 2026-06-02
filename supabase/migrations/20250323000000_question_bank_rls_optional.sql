-- =============================================================================
-- OPTIONAL — if you prefer browser/anon access instead of admin API + service role
-- =============================================================================
-- When RLS is ON and there is no SELECT policy, PostgREST returns **zero rows**
-- (not an error). That is why the admin UI uses `/api/admin/course/.../question-bank`
-- with SUPABASE_SERVICE_ROLE_KEY.
--
-- To allow the **anon key** or **authenticated** role to read `question_bank` directly,
-- add policies like below (tighten USING for your security model).

-- ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "question_bank_select_authenticated"
--   ON public.question_bank
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- For public read (usually too open):
-- CREATE POLICY "question_bank_select_anon"
--   ON public.question_bank
--   FOR SELECT
--   TO anon
--   USING (true);
