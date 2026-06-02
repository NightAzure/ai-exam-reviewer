-- =============================================================================
-- public.question_bank — matches app + Supabase dashboard schema
-- (no course_id / question_type / is_archived; choice_e nullable)
-- =============================================================================

DROP TABLE IF EXISTS public.question_bank_questions CASCADE;
DROP TABLE IF EXISTS public.question_bank CASCADE;

CREATE TABLE public.question_bank (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question          text        NOT NULL,
    subject           text        NOT NULL,
    topic             text        NOT NULL,
    choice_a          text        NOT NULL,
    choice_b          text        NOT NULL,
    choice_c          text        NOT NULL,
    choice_d          text        NOT NULL,
    choice_e          text,
    correct_answer    text        NOT NULL,
    explanation       text,
    difficulty_level  smallint    NOT NULL
        CHECK (difficulty_level BETWEEN 1 AND 5),
    created_by        uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.question_bank.difficulty_level IS '1 = easiest, 5 = hardest';

CREATE INDEX idx_question_bank_subject ON public.question_bank (subject);
CREATE INDEX idx_question_bank_topic ON public.question_bank (topic);

CREATE OR REPLACE FUNCTION public.set_question_bank_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_question_bank_updated_at
    BEFORE UPDATE ON public.question_bank
    FOR EACH ROW
    EXECUTE FUNCTION public.set_question_bank_updated_at();

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Add RLS policies in the Supabase dashboard for your roles.
