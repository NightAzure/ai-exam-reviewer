import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Course,
  CreateCourseRequest,
  UpdateCourseRequest,
} from '@/types/course';

interface CourseState {
  // Data
  courses: Map<number, Course>; // id -> course data

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions - CRUD Operations (Backend-ready)
  createCourse: (data: CreateCourseRequest) => Promise<Course>;
  updateCourse: (data: UpdateCourseRequest) => Promise<Course>;
  deleteCourse: (id: number) => Promise<void>;
  getCourse: (id: number) => Course | undefined;
  getAllCourses: () => Course[];
  getActiveCourses: () => Course[];

  // Actions - Data Management
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;
  removeCourse: (id: number) => void;

  // Computed helpers
  calculateProgress: (course: Course) => number;

  // Integration with assessment store
  refreshCourseStats: (courseId: number) => Promise<void>;
}

type PersistedCourseState = {
  courses?: Array<[number, Course]>;
};

const LEGACY_COURSE_STORAGE_KEY = 'course-storage';

// Helper to calculate overall course progress
const calculateCourseProgress = (course: Course): number => {
  if (course.topics.length === 0) return 0;
  const totalProgress = course.topics.reduce((sum, topic) => sum + topic.progress, 0);
  return Math.round(totalProgress / course.topics.length);
};

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        courses: new Map(),
        isLoading: false,
        error: null,

        // CRUD Operations
        createCourse: async (data: CreateCourseRequest) => {
          set({ isLoading: true, error: null });
          try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/courses', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(data),
            // });
            // const result = await response.json();
            // const newCourse = result.course;

            // Mock implementation
            const newId = Math.max(0, ...Array.from(get().courses.keys())) + 1;
            const newCourse: Course = {
              id: newId,
              code: data.code,
              title: data.title,
              description: data.description,
              thumbnail: data.thumbnail,
              instructor: data.instructor,
              isActive: data.isActive ?? true,
              startDate: data.startDate,
              endDate: data.endDate,
              enrollmentLimit: data.enrollmentLimit,
              topics: data.topics || [],
              stats: {
                totalStudents: 0,
                proficient: 0,
                needsReview: 0,
                averageProgress: 0,
              },
              insights: {
                strengths: [],
                weaknesses: [],
                suggestions: [],
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            get().addCourse(newCourse);
            set({ isLoading: false });
            return newCourse;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create course';
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        updateCourse: async (data: UpdateCourseRequest) => {
          set({ isLoading: true, error: null });
          try {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/courses/${data.id}`, {
            //   method: 'PUT',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(data),
            // });
            // const result = await response.json();
            // const updatedCourse = result.course;

            // Mock implementation
            const existing = get().courses.get(data.id);
            if (!existing) {
              throw new Error('Course not found');
            }

            const updatedCourse: Course = {
              ...existing,
              ...(data.code && { code: data.code }),
              ...(data.title && { title: data.title }),
              ...(data.description && { description: data.description }),
              ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
              ...(data.instructor && { instructor: data.instructor }),
              ...(data.isActive !== undefined && { isActive: data.isActive }),
              ...(data.startDate !== undefined && { startDate: data.startDate }),
              ...(data.endDate !== undefined && { endDate: data.endDate }),
              ...(data.enrollmentLimit !== undefined && { enrollmentLimit: data.enrollmentLimit }),
              ...(data.topics && { topics: data.topics }),
              ...(data.insights && {
                insights: {
                  ...existing.insights,
                  ...data.insights,
                },
              }),
              updatedAt: new Date().toISOString(),
            };

            set((state) => {
              const newCourses = new Map(state.courses);
              newCourses.set(data.id, updatedCourse);
              return { courses: newCourses, isLoading: false };
            });

            return updatedCourse;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update course';
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        deleteCourse: async (id: number) => {
          set({ isLoading: true, error: null });
          try {
            // TODO: Replace with actual API call
            // await fetch(`/api/courses/${id}`, {
            //   method: 'DELETE',
            // });

            // Mock implementation
            get().removeCourse(id);
            set({ isLoading: false });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete course';
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        getCourse: (id: number) => {
          return get().courses.get(id);
        },

        getAllCourses: () => {
          return Array.from(get().courses.values());
        },

        getActiveCourses: () => {
          return Array.from(get().courses.values()).filter(course => course.isActive);
        },

        // Data management
        setCourses: (courses: Course[]) => {
          const coursesMap = new Map<number, Course>();
          courses.forEach((course) => {
            coursesMap.set(course.id, course);
          });
          set({ courses: coursesMap });
        },

        addCourse: (course: Course) => {
          set((state) => {
            const newCourses = new Map(state.courses);
            newCourses.set(course.id, course);
            return { courses: newCourses };
          });
        },

        removeCourse: (id: number) => {
          set((state) => {
            const newCourses = new Map(state.courses);
            newCourses.delete(id);
            return { courses: newCourses };
          });
        },

        // Helpers
        calculateProgress: calculateCourseProgress,

        refreshCourseStats: async (courseId: number) => {
          // TODO: Fetch updated stats from backend
          // This would typically recalculate stats based on student data
          // For now, this is a placeholder
          const course = get().courses.get(courseId);
          if (course) {
            await get().updateCourse({
              id: courseId,
              insights: {
                ...course.insights,
              },
            });
          }
        },
      }),
      {
        name: 'course-ui-storage',
        version: 1,
        // Course records are loaded from Supabase and can be user-specific. Keep
        // persisted storage empty so localStorage does not leak course data across users.
        partialize: () => ({
          courses: [] as Array<[number, Course]>,
        }),
        // Migration function for version changes
        migrate: (persistedState: unknown, version: number) => {
          const normalizedState =
            persistedState && typeof persistedState === "object"
              ? (persistedState as PersistedCourseState)
              : {};

          // Clear any previously persisted course data.
          if (version < 1) {
            return {
              courses: [],
            };
          }
          return normalizedState;
        },
        // Custom serialization for Maps
        storage: {
          getItem: (name) => {
            localStorage.removeItem(LEGACY_COURSE_STORAGE_KEY);
            const str = localStorage.getItem(name);
            if (!str) return null;
            try {
              const { state } = JSON.parse(str);
              return {
                state: {
                  ...state,
                  courses: new Map(state.courses ?? []),
                },
              };
            } catch {
              // If parsing fails, return null to trigger fresh state
              return null;
            }
          },
          setItem: (name, value) => {
            localStorage.removeItem(LEGACY_COURSE_STORAGE_KEY);
            const str = JSON.stringify({
              state: {
                ...value.state,
                courses: Array.from(
                  ((value.state.courses as Map<number, Course> | undefined) ?? new Map()).entries(),
                ),
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
