"use client";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, Activity, Award, AlertTriangle, UserCheck, Clock, Target } from "lucide-react";
import { Course } from "@/types/course";
import { useAdminCourseAnalytics } from "@/hooks/use-admin-course-analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminCourseInsightsProps {
  course: Course;
}

export default function AdminCourseInsights({ course }: AdminCourseInsightsProps) {
  const { analytics, error, isLoading } = useAdminCourseAnalytics(course.id);

  const studentsByStatus = analytics?.studentsByStatus ?? {
    excellent: 0,
    onTrack: 0,
    atRisk: 0,
    needsHelp: 0,
  };

  const recentActivity = analytics?.recentActivity ?? [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "success":
        return <div className="bg-green-100 p-2 rounded-lg"><Award className="w-4 h-4 text-green-600" /></div>;
      case "warning":
        return <div className="bg-yellow-100 p-2 rounded-lg"><AlertTriangle className="w-4 h-4 text-yellow-600" /></div>;
      default:
        return <div className="bg-blue-100 p-2 rounded-lg"><Activity className="w-4 h-4 text-blue-600" /></div>;
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border border-green-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-green-500/10 p-2 rounded-lg">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Student Status Overview</h3>
            <p className="text-xs text-gray-500">Performance distribution across course</p>
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-700">{studentsByStatus.excellent}</p>
                <p className="text-xs text-green-600 mt-0.5">Excellent (&ge;90%)</p>
              </div>
              <Target className="w-8 h-8 text-green-500/30" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-700">{studentsByStatus.onTrack}</p>
                <p className="text-xs text-blue-600 mt-0.5">On Track (70-89%)</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500/30" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-700">{studentsByStatus.atRisk}</p>
                <p className="text-xs text-yellow-600 mt-0.5">At Risk (50-69%)</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500/30" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-700">{studentsByStatus.needsHelp}</p>
                <p className="text-xs text-red-600 mt-0.5">Needs Help (&lt;50%)</p>
              </div>
              <Clock className="w-8 h-8 text-red-500/30" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-primary/10 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-xs text-gray-500">Latest student interactions</p>
          </div>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No recent assessment activity yet.
            </div>
          ) : (
            recentActivity.map((activity, idx) => (
              <div key={`${activity.student}-${idx}`} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 hover:bg-blue-50 transition-colors border border-blue-100">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold text-primary">{activity.student}</span>{" "}
                    <span className="text-gray-600">{activity.action}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
