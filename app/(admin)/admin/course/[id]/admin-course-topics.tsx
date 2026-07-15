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
    <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-ink" />
          <CardTitle className="text-base font-semibold m-0">
            Topic Performance
          </CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">Student progress by topic</span>
      </div>

      <CardContent className="space-y-3 p-0">
        {course.topics && course.topics.length > 0 ? (
          course.topics.map((topic) => {
            const colorClass =
              topic.progress < 40
                ? "bg-needs-focus/80"
                : topic.progress < 75
                ? "bg-yellow-500"
                : "bg-proficient/100";

            const badgeClass =
              topic.progress < 40
                ? "bg-red-100 text-needs-focus"
                : topic.progress < 75
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-proficient";

            const status =
              topic.progress < 40
                ? "Needs Focus"
                : topic.progress < 75
                ? "In Progress"
                : "Excelling";

            const icon =
              topic.progress < 40 ? (
                <AlertTriangle className="w-4 h-4 text-needs-focus" />
              ) : topic.progress < 75 ? (
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-proficient" />
              );

            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32 }}
                className="p-3 rounded-xl border border-border/60 bg-muted/50 hover:bg-muted transition"
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
                      <span className="text-xs text-muted-foreground">
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

                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={`${colorClass} h-full rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-500`}
                    style={{ width: `${topic.progress}%` }}
                  />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No topics available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
