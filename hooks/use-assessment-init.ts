'use client'

import { useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAssessmentStore } from '@/stores/assessment-store';
import {
  isMissingRelationError,
  loadAssessmentsFromSupabase,
} from '@/utils/supabase/assessments';

export function useAssessmentInit(courseId?: number) {
  const setAssessments = useAssessmentStore((state) => state.setAssessments);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    const loadAssessments = async () => {
      try {
        const mappedAssessments = await loadAssessmentsFromSupabase(supabase, courseId);
        if (!cancelled) {
          setAssessments(mappedAssessments);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown assessment loading error';

        if (!isMissingRelationError(message)) {
          console.error('Failed to load assessments from Supabase:', error);
        }

        if (!cancelled) {
          setAssessments([]);
        }
      }
    };

    loadAssessments();

    return () => {
      cancelled = true;
    };
  }, [courseId, setAssessments, supabase]);
}
