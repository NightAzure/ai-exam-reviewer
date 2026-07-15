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
        return <div className="bg-green-100 p-2 rounded-lg"><Award className="w-4 h-4 text-proficient" /></div>;
      case "warning":
        return <div className="bg-yellow-100 p-2 rounded-lg"><AlertTriangle className="w-4 h-4 text-yellow-600" /></div>;
      default:
        return <div className="bg-blue-100 p-2 rounded-lg"><Activity className="w-4 h-4 text-evidence" /></div>;
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border border-proficient/20 rounded-2xl bg-card shadow-sm hover:shadow-md transition p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-proficient/100/10 p-2 rounded-lg">
            <UserCheck className="w-5 h-5 text-proficient" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Student Status Overview</h3>
            <p className="text-xs text-muted-foreground">Performance distribution across course</p>
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-proficient/10 border border-proficient/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-proficient">{studentsByStatus.excellent}</p>
                <p className="text-xs text-proficient mt-0.5">Excellent (&ge;90%)</p>
              </div>
              <Target className="w-8 h-8 text-proficient/30" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-evidence/10 border border-evidence/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-700">{studentsByStatus.onTrack}</p>
                <p className="text-xs text-evidence mt-0.5">On Track (70-89%)</p>
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
          <div className="p-3 rounded-xl bg-needs-focus/8 border border-needs-focus/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-needs-focus">{studentsByStatus.needsHelp}</p>
                <p className="text-xs text-needs-focus mt-0.5">Needs Help (&lt;50%)</p>
              </div>
              <Clock className="w-8 h-8 text-red-500/30" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-ink/10 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-ink" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
            <p className="text-xs text-muted-foreground">Latest student interactions</p>
          </div>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No recent assessment activity yet.
            </div>
          ) : (
            recentActivity.map((activity, idx) => (
              <div key={`${activity.student}-${idx}`} className="flex items-start gap-3 p-3 rounded-xl bg-evidence/10/50 hover:bg-evidence/10 transition-colors border border-blue-100">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-ink">{activity.student}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
