"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import AdminCoursesHeader from "./admin-courses-header";
import CourseCard from "@/components/course/course-card";
import { useCourses } from "@/hooks/use-courses";
import CourseCardSkeleton from "@/components/course/course-card-skeleton";
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};


export type FilterOptions = {
  status: string;
  instructor: string;
  searchQuery: string;
  sortBy: string;
  enabledStatus: string;
};

export default function AdminCoursesView() {
  const { data: courses } = useCourses();
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    instructor: "all",
    searchQuery: "",
    sortBy: "name",
    enabledStatus: "all"
  });

  const filteredCourses = (courses ?? [])
    .filter((course) => {
      if (filters.enabledStatus === "enabled" && !course.is_active) return false;
      if (filters.enabledStatus === "disabled" && course.is_active) return false;

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          course.title.toLowerCase().includes(query) ||
          course.code.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "name":
          return a.title.localeCompare(b.title);
        case "code":
          return a.code.localeCompare(b.code);
        default:
          return 0;
      }
    });

  const stats = {
    total: courses?.length ?? 0,
    active: courses?.filter(c => c.is_active).length ?? 0,
    disabled: courses?.filter(c => !c.is_active).length ?? 0,
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <AdminCoursesHeader
          filters={filters}
          setFilters={setFilters}
          stats={stats}
        />
      </motion.div>

      {courses === undefined ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {Array.from({ length: 6 }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <motion.div
          key="no-courses"
          variants={itemVariants}
          className="text-center py-12 text-muted-foreground"
        >
          <p className="text-lg">No courses found matching your filters.</p>
          <p className="text-sm mt-2">Try adjusting your search criteria.</p>
        </motion.div>
      ) : (
        <motion.div
          key="courses-grid"
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredCourses.map((course) => (
            <motion.div key={`course-${course.id}`} variants={itemVariants}>
              <CourseCard course={course} variant="admin"/>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
