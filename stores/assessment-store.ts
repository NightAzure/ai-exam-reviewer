import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client';
import {
  createAssessmentInSupabase,
  deleteAssessmentInSupabase,
  updateAssessmentInSupabase,
} from '@/utils/supabase/assessments';
import type {
  AssessmentFull,
  AssessmentDisplay,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
} from '@/types/assessment';

interface AssessmentState {
  // Data
  assessments: Map<number, AssessmentFull>; // id -> full assessment data
  assessmentsByCourse: Map<number, number[]>; // courseId -> assessment ids

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions - CRUD Operations (Backend-ready)
  createAssessment: (data: CreateAssessmentRequest) => Promise<AssessmentFull>;
  updateAssessment: (data: UpdateAssessmentRequest) => Promise<AssessmentFull>;
  deleteAssessment: (id: number) => Promise<void>;
  getAssessment: (id: number) => AssessmentFull | undefined;
  getAssessmentsByCourse: (courseId: number) => AssessmentDisplay[];

  // Actions - Data Management
  setAssessments: (assessments: AssessmentFull[]) => void;
  addAssessment: (assessment: AssessmentFull) => void;
  removeAssessment: (id: number) => void;

  // Computed helpers
  getAssessmentDisplay: (assessment: AssessmentFull) => AssessmentDisplay;
  calculateTotalQuestions: (assessment: AssessmentFull) => number;
  extractSubjects: (assessment: AssessmentFull) => string[];
}

// Helper to convert full assessment to display format
const toDisplay = (assessment: AssessmentFull): AssessmentDisplay => {
  const totalQuestions =
    assessment.questionMode === "manual"
      ? assessment.questions.length
      : assessment.randomSubjectSelections.reduce((sum, s) => sum + s.count, 0);

  const subjects =
    assessment.questionMode === "manual"
      ? [...new Set(assessment.questions.map(q => q.subject).filter(Boolean) as string[])]
      : assessment.randomSubjectSelections.map(s => s.subject);

  return {
    id: assessment.id,
    courseId: assessment.courseId,
    title: assessment.title,
    description: assessment.description,
    duration: assessment.duration,
    maxAttempts: assessment.maxAttempts,
    isEnabled: assessment.isEnabled,
    releaseDate: assessment.releaseDate,
    deadline: assessment.deadline,
    questionMode: assessment.questionMode,
    totalQuestions,
    subjects,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
};

export const useAssessmentStore = create<AssessmentState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        assessments: new Map(),
        assessmentsByCourse: new Map(),
        isLoading: false,
        error: null,

        // CRUD Operations
        createAssessment: async (data: CreateAssessmentRequest) => {
          set({ isLoading: true, error: null });
          try {
            const supabase = createClient();
            const newAssessment = await createAssessmentInSupabase(supabase, data);

            get().addAssessment(newAssessment);
            set({ isLoading: false });
            return newAssessment;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create assessment';
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        updateAssessment: async (data: UpdateAssessmentRequest) => {
          set({ isLoading: true, error: null });
          try {
            const supabase = createClient();
            const updatedAssessment = await updateAssessmentInSupabase(supabase, data);

            set((state) => {
              const newAssessments = new Map(state.assessments);
              newAssessments.set(data.id, updatedAssessment);
              return { assessments: newAssessments, isLoading: false };
            });

            return updatedAssessment;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update assessment';
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        deleteAssessment: async (id: number) => {
          set({ isLoading: true, error: null });
          try {
            const supabase = createClient();
            await deleteAssessmentInSupabase(supabase, id);
            get().removeAssessment(id);
            set({ isLoading: false });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete assessment';
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        getAssessment: (id: number) => {
          return get().assessments.get(id);
        },

        getAssessmentsByCourse: (courseId: number) => {
          const assessmentIds = get().assessmentsByCourse.get(courseId) || [];
          const assessments = assessmentIds
            .map(id => get().assessments.get(id))
            .filter(Boolean) as AssessmentFull[];

          return assessments.map(toDisplay);
        },

        // Data management
        setAssessments: (assessments: AssessmentFull[]) => {
          const assessmentsMap = new Map<number, AssessmentFull>();
          const byCourseMap = new Map<number, number[]>();

          assessments.forEach((assessment) => {
            assessmentsMap.set(assessment.id, assessment);

            const courseAssessments = byCourseMap.get(assessment.courseId) || [];
            courseAssessments.push(assessment.id);
            byCourseMap.set(assessment.courseId, courseAssessments);
          });

          set({
            assessments: assessmentsMap,
            assessmentsByCourse: byCourseMap,
          });
        },

        addAssessment: (assessment: AssessmentFull) => {
          set((state) => {
            const newAssessments = new Map(state.assessments);
            newAssessments.set(assessment.id, assessment);

            const newByCourse = new Map(state.assessmentsByCourse);
            const courseAssessments = newByCourse.get(assessment.courseId) || [];
            if (!courseAssessments.includes(assessment.id)) {
              courseAssessments.push(assessment.id);
              newByCourse.set(assessment.courseId, courseAssessments);
            }

            return {
              assessments: newAssessments,
              assessmentsByCourse: newByCourse,
            };
          });
        },

        removeAssessment: (id: number) => {
          set((state) => {
            const assessment = state.assessments.get(id);
            if (!assessment) return state;

            const newAssessments = new Map(state.assessments);
            newAssessments.delete(id);

            const newByCourse = new Map(state.assessmentsByCourse);
            const courseAssessments = newByCourse.get(assessment.courseId) || [];
            const filtered = courseAssessments.filter(aid => aid !== id);
            newByCourse.set(assessment.courseId, filtered);

            return {
              assessments: newAssessments,
              assessmentsByCourse: newByCourse,
            };
          });
        },

        // Helpers
        getAssessmentDisplay: toDisplay,

        calculateTotalQuestions: (assessment: AssessmentFull) => {
          return assessment.questionMode === "manual"
            ? assessment.questions.length
            : assessment.randomSubjectSelections.reduce((sum, s) => sum + s.count, 0);
        },

        extractSubjects: (assessment: AssessmentFull) => {
          return assessment.questionMode === "manual"
            ? [...new Set(assessment.questions.map(q => q.subject).filter(Boolean) as string[])]
            : assessment.randomSubjectSelections.map(s => s.subject);
        },
      }),
      {
        name: 'assessment-storage',
        // Only persist the data, not UI state
        partialize: (state) => ({
          assessments: Array.from(state.assessments.entries()),
          assessmentsByCourse: Array.from(state.assessmentsByCourse.entries()),
        }),
        // Custom serialization for Maps
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const { state } = JSON.parse(str);
            return {
              state: {
                ...state,
                assessments: new Map(state.assessments),
                assessmentsByCourse: new Map(state.assessmentsByCourse),
              },
            };
          },
          setItem: (name, value) => {
            const str = JSON.stringify({
              state: {
                ...value.state,
                assessments: Array.from((value.state.assessments as Map<number, AssessmentFull>).entries()),
                assessmentsByCourse: Array.from((value.state.assessmentsByCourse as Map<number, number[]>).entries()),
              },
            });
            localStorage.setItem(name, str);
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      }
    )
  )
);
