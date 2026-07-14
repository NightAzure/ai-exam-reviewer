"use client";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Award, BookOpen, Loader2 } from "lucide-react";
import { Course } from "@/types/course";
import { useAdminCourseAnalytics } from "@/hooks/use-admin-course-analytics";

interface AdminCourseStatsProps {
  course: Course;
}

export default function AdminCourseStats({ course }: AdminCourseStatsProps) {
  const { analytics, isLoading } = useAdminCourseAnalytics(course.id);

  const stats = {
    totalEnrolled: analytics?.totalEnrolled ?? course.stats?.totalStudents ?? 0,
    avgScore: analytics?.averageScore ?? 0,
    completionRate: analytics?.completionRate ?? 0,
    activeToday: analytics?.activeToday ?? 0,
  };

  return (
    <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Course Statistics</h3>
          <p className="text-xs text-muted-foreground">Real-time overview</p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{stats.totalEnrolled} Students</p>
              <p className="text-xs text-blue-600">Enrolled in course</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-purple-500/10 p-1.5 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-foreground">Average Score</p>
            </div>
            <span className="text-lg font-bold text-purple-600">{stats.avgScore}%</span>
          </div>
          <div className="w-full bg-purple-100 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, stats.avgScore))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/10 p-2 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{stats.completionRate}%</p>
              <p className="text-xs text-green-600">Completion rate</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <BookOpen className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{stats.activeToday} Active</p>
              <p className="text-xs text-orange-600">Active today</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
