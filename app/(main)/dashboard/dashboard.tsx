"use client";

import { useMemo, useState } from "react";
import DashboardHeader from "./dashboard-header";
import { motion } from "framer-motion";
import CourseCard from "@/components/course/course-card";
import { useMyCourses } from "@/hooks/use-my-courses";
import CourseCardSkeleton from "@/components/course/course-card-skeleton";
import JoinCourseCard from "./join-course-card";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function Dashboard() {
  const { data: courses } = useMyCourses();
  const [filter, setFilter] = useState<string>("all");


  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    const now = new Date().getTime();

    return courses.filter((course) => {
      if (filter === "all") return true;

      if (filter === "completed") {
        return Boolean(course.end_date && new Date(course.end_date).getTime() < now);
      }

      if (filter === "in-progress") {
        const started =
          !course.start_date || new Date(course.start_date).getTime() <= now;
        const notEnded =
          !course.end_date || new Date(course.end_date).getTime() >= now;
        return started && notEnded;
      }

      return true;
    });
  }, [courses, filter]);

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <DashboardHeader setFilter={setFilter}/>
      </motion.div>

      {courses === undefined ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {Array.from({ length: 6 }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <motion.div
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredCourses.map((course) => (
            <motion.div key={`course-${course.id}`} variants={itemVariants}>
              <CourseCard course={course}/>
            </motion.div>
          ))}
          <motion.div variants={itemVariants} className="h-full">
            <JoinCourseCard />
          </motion.div>
        </motion.div>
      ) : courses.length === 0 ? (
        <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="py-6">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
            <JoinCourseCard />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="no-match"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-3 py-16 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-base font-medium">No courses match this filter.</p>
          <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
            Clear filter
          </Button>
        </motion.div>
      )}
    </motion.div>
  );

}
