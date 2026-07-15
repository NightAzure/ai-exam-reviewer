"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  BookOpen,
  ClipboardList,
  MessageCircle,
  TrendingUp,
  Award,
  Activity,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

function MetricCard({
  title,
  value,
  growth,
  icon: Icon,
  tone = "ink",
}: {
  title: string;
  value: number;
  growth: number;
  tone?: "ink" | "oxblood" | "slate" | "brass";
  icon: LucideIcon;
}) {
  const toneClass =
    tone === "oxblood"
      ? "bg-oxblood"
      : tone === "slate"
        ? "bg-ink-raised"
        : tone === "brass"
          ? "bg-[#3d4f6b]"
          : "bg-ink";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-ink/10 p-5 text-white shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${toneClass}`}
    >
      <div className="absolute top-0 right-0 w-28 h-28 translate-x-8 -translate-y-8 opacity-15">
        <Icon className="w-full h-full" aria-hidden="true" />
      </div>
      <div className="relative z-10">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-5 w-5 text-brass" aria-hidden="true" />
          <span className="text-sm font-medium text-white/90">{title}</span>
        </div>
        <div className="mb-1 font-[family-name:var(--font-display)] text-3xl font-medium tabular-nums">
          {value.toLocaleString("en-PH")}
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-white/80" aria-hidden="true" />
          <span className="text-sm font-semibold tabular-nums text-white/90">
            {growth >= 0 ? "+" : ""}
            {growth}%
          </span>
          <span className="text-xs text-white/70">vs last month</span>
        </div>
      </div>
    </div>
  );
}

const insightToneStyles = {
  success: {
    wrapper: "bg-proficient/10 border-proficient/20",
    icon: CheckCircle2,
    iconClass: "text-proficient",
  },
  warning: {
    wrapper: "bg-building-confidence/10 border-building-confidence/20",
    icon: AlertTriangle,
    iconClass: "text-building-confidence",
  },
  info: {
    wrapper: "bg-evidence/10 border-evidence/20",
    icon: Activity,
    iconClass: "text-evidence",
  },
  highlight: {
    wrapper: "bg-oxblood/10 border-oxblood/20",
    icon: Award,
    iconClass: "text-oxblood",
  },
};

export default function AdminDashboardPage() {
  const { analytics, error, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(135deg, #f3f4f6 0%, rgb(36 51 76 / 12%) 100%)" }}>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
        {/* Chart placeholders */}
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader className="pb-3 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-slate mt-1">Platform overview</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error ?? "Unable to load dashboard analytics."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate">
          Course health, enrollments, and recent platform activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={analytics.totalUsers}
          growth={analytics.totalUsersGrowth}
          icon={Users}
          tone="ink"
        />
        <MetricCard
          title="Courses"
          value={analytics.totalCourses}
          growth={analytics.totalCoursesGrowth}
          icon={BookOpen}
          tone="oxblood"
        />
        <MetricCard
          title="Assessments"
          value={analytics.assessments}
          growth={analytics.assessmentsGrowth}
          icon={ClipboardList}
          tone="slate"
        />
        <MetricCard
          title="Messages"
          value={analytics.messages}
          growth={analytics.messagesGrowth}
          icon={MessageCircle}
          tone="brass"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              User Growth Trend
            </CardTitle>
            <p className="text-xs text-slate mt-1">
              Total users vs active sign-ins over 6 months
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={analytics.userGrowthData.map((point) => ({
                  month: point.label,
                  users: point.total,
                  active: point.active,
                }))}
              >
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18243a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#18243a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8e3039" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8e3039" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(36 51 76 / 12%)" />
                <XAxis dataKey="month" stroke="#647087" />
                <YAxis stroke="#647087" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid rgb(36 51 76 / 12%)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#18243a"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke="#8e3039"
                  fillOpacity={1}
                  fill="url(#colorActive)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Assessment Completion
            </CardTitle>
            <p className="text-xs text-slate mt-1">
              Student progress across enrolled learners
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid rgb(36 51 76 / 12%)",
                    borderRadius: "8px",
                  }}
                />
                <Pie
                  data={analytics.assessmentCompletionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={100}
                  fill="#647087"
                  dataKey="value"
                >
                  {analytics.assessmentCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Course Performance
            </CardTitle>
            <p className="text-xs text-slate mt-1">
              Enrollment volume with average assessment score by course
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analytics.coursePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(36 51 76 / 12%)" />
                <XAxis dataKey="topic" stroke="#647087" />
                <YAxis
                  yAxisId="students"
                  stroke="#047857"
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="score"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="#18243a"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid rgb(36 51 76 / 12%)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="students"
                  dataKey="students"
                  fill="#047857"
                  name="Students Enrolled"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="score"
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#18243a"
                  strokeWidth={2}
                  dot={{ fill: "#18243a", r: 4 }}
                  name="Avg Score"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Student Performance
            </CardTitle>
            <p className="text-xs text-slate mt-1">
              Distribution of student performance levels
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.studentPerformanceData.map((item, index) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground/80">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] ${
                        index === 0
                          ? "bg-proficient/100"
                          : index === 1
                            ? "bg-evidence/100"
                            : index === 2
                              ? "bg-yellow-500"
                              : "bg-needs-focus/80"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-lg bg-evidence/10 border border-blue-100">
              <p className="text-sm text-foreground/80">
                <span className="font-semibold text-foreground">Tracked Students:</span>{" "}
                {analytics.studentPerformanceData.reduce((sum, item) => sum + item.count, 0)}
              </p>
              <p className="text-xs text-slate mt-1">
                Distribution is based on average completed assessment scores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Weekly Platform Activity
            </CardTitle>
            <p className="text-xs text-slate mt-1">
              Active users by week
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.weeklyActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(36 51 76 / 12%)" />
                <XAxis dataKey="label" stroke="#647087" />
                <YAxis stroke="#647087" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid rgb(36 51 76 / 12%)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#8e3039"
                  strokeWidth={2}
                  dot={{ fill: "#8e3039", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Platform Signals
            </CardTitle>
            <p className="text-xs text-slate mt-1">
              Derived trends and areas to watch
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.quickInsights.map((insight) => {
              const style = insightToneStyles[insight.tone];
              const Icon = style.icon;

              return (
                <div
                  key={insight.title}
                  className={`p-3 rounded-lg border ${style.wrapper}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.iconClass}`} />
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {insight.title}
                      </p>
                      <p className="text-xs text-slate mt-0.5">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
