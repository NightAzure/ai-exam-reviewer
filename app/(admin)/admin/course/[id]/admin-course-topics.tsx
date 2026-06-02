"use client";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Course } from "@/types/course";
import { motion } from "framer-motion";

interface AdminCourseTopicsProps {
  course: Course;
}

export default function AdminCourseTopics({ course }: AdminCourseTopicsProps) {
  return (
    <Card className="border border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold m-0">
            Topic Performance
          </CardTitle>
        </div>
        <span className="text-xs text-gray-500">Student progress by topic</span>
      </div>

      <CardContent className="space-y-3 p-0">
        {course.topics && course.topics.length > 0 ? (
          course.topics.map((topic) => {
            const colorClass =
              topic.progress < 40
                ? "bg-red-500"
                : topic.progress < 75
                ? "bg-yellow-500"
                : "bg-green-500";

            const badgeClass =
              topic.progress < 40
                ? "bg-red-100 text-red-700"
                : topic.progress < 75
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700";

            const status =
              topic.progress < 40
                ? "Needs Focus"
                : topic.progress < 75
                ? "In Progress"
                : "Excelling";

            const icon =
              topic.progress < 40 ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : topic.progress < 75 ? (
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              );

            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32 }}
                className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {icon}
                      <p className="text-sm font-medium truncate">{topic.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${badgeClass}`}>
                        {status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {topic.progress < 40
                          ? "Highest review priority"
                          : topic.progress < 75
                          ? "Worth revisiting soon"
                          : "Healthy performance signal"}
                      </span>
                    </div>
                  </div>

                  <Badge variant="secondary" className="text-xs shrink-0">
                    {topic.progress}%
                  </Badge>
                </div>

                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`${colorClass} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${topic.progress}%` }}
                  />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-6 text-sm text-gray-500">
            No topics available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
