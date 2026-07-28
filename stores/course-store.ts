import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Course } from '@/types/course';

interface CourseState {
  courses: Map<number, Course>;
  getCourse: (id: number) => Course | undefined;
  setCourses: (courses: Course[]) => void;
}

type PersistedCourseState = {
  courses?: Array<[number, Course]>;
};

const LEGACY_COURSE_STORAGE_KEY = 'course-storage';

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      (set, get) => ({
        courses: new Map(),

        getCourse: (id: number) => get().courses.get(id),

        setCourses: (courses: Course[]) => {
          const coursesMap = new Map<number, Course>();
          courses.forEach((course) => {
            coursesMap.set(course.id, course);
          });
          set({ courses: coursesMap });
        },
      }),
      {
        name: 'course-ui-storage',
        version: 1,
        partialize: () => ({
          courses: [] as Array<[number, Course]>,
        }),
        migrate: (persistedState: unknown, version: number) => {
          const normalizedState =
            persistedState && typeof persistedState === "object"
              ? (persistedState as PersistedCourseState)
              : {};

          if (version < 1) {
            return { courses: [] };
          }
          return normalizedState;
        },
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
