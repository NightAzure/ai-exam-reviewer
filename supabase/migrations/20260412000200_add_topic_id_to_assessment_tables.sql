-- Add topic_id FK to assessment_questions, assessment_random_rules, and assessment_attempt_answers.
-- Backfill by matching the subject string to topics.name within the same course.
-- Subject columns are kept; topic_id is the authoritative link going forward.

-- assessment_questions
ALTER TABLE public.assessment_questions
  ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_questions_topic_id
  ON public.assessment_questions(topic_id);

UPDATE public.assessment_questions aq
SET topic_id = t.id
FROM public.assessments a, public.topics t
WHERE aq.assessment_id = a.id
  AND t.course_id = a.course_id
  AND LOWER(t.name) = LOWER(aq.subject)
  AND aq.subject IS NOT NULL
  AND aq.topic_id IS NULL;

-- assessment_random_rules
ALTER TABLE public.assessment_random_rules
  ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_random_rules_topic_id
  ON public.assessment_random_rules(topic_id);

UPDATE public.assessment_random_rules arr
SET topic_id = t.id
FROM public.assessments a, public.topics t
WHERE arr.assessment_id = a.id
  AND t.course_id = a.course_id
  AND LOWER(t.name) = LOWER(arr.subject)
  AND arr.topic_id IS NULL;

-- assessment_attempt_answers
ALTER TABLE public.assessment_attempt_answers
  ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_attempt_answers_topic_id
  ON public.assessment_attempt_answers(topic_id);

UPDATE public.assessment_attempt_answers aaa
SET topic_id = t.id
FROM public.assessment_attempts aa, public.assessments a, public.topics t
WHERE aaa.attempt_id = aa.id
  AND a.id = aa.assessment_id
  AND t.course_id = a.course_id
  AND LOWER(t.name) = LOWER(aaa.subject)
  AND aaa.subject IS NOT NULL
  AND aaa.topic_id IS NULL;
