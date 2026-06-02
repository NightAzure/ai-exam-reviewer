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
import { useState } from "react";
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
  color,
  index,
}: {
  title: string;
  value: number;
  growth: number;
  color: string;
  index: number;
  icon: LucideIcon;
}) {
  const [hoveredMetric, setHoveredMetric] = useState<number | null>(null);

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 cursor-pointer ${
        hoveredMetric === index ? "scale-105 shadow-lg" : "shadow-md"
      }`}
      style={{
        background: `linear-gradient(135deg, ${color}f0 0%, ${color}d0 100%)`,
      }}
      onMouseEnter={() => setHoveredMetric(index)}
      onMouseLeave={() => setHoveredMetric(null)}
    >
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
        <Icon className="w-full h-full" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-5 w-5 text-white" />
          <span className="text-sm font-medium text-white/90">{title}</span>
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {value.toLocaleString()}
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-white/80" />
          <span className="text-sm font-semibold text-white/90">
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
    wrapper: "bg-green-50 border-green-100",
    icon: CheckCircle2,
    iconClass: "text-green-600",
  },
  warning: {
    wrapper: "bg-yellow-50 border-yellow-100",
    icon: AlertTriangle,
    iconClass: "text-yellow-600",
  },
  info: {
    wrapper: "bg-blue-50 border-blue-100",
    icon: Activity,
    iconClass: "text-blue-600",
  },
  highlight: {
    wrapper: "bg-purple-50 border-purple-100",
    icon: Award,
    iconClass: "text-purple-600",
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
            <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)" }}>
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back! Here&apos;s an overview of your platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={analytics.totalUsers}
          growth={analytics.totalUsersGrowth}
          icon={Users}
          color="#3b82f6"
          index={0}
        />
        <MetricCard
          title="Courses"
          value={analytics.totalCourses}
          growth={analytics.totalCoursesGrowth}
          icon={BookOpen}
          color="#8b5cf6"
          index={1}
        />
        <MetricCard
          title="Assessments"
          value={analytics.assessments}
          growth={analytics.assessmentsGrowth}
          icon={ClipboardList}
          color="#10b981"
          index={2}
        />
        <MetricCard
          title="Messages"
          value={analytics.messages}
          growth={analytics.messagesGrowth}
          icon={MessageCircle}
          color="#f59e0b"
          index={3}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              User Growth Trend
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorActive)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Assessment Completion
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Student progress across enrolled learners
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
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
                  fill="#8884d8"
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
        <Card className="border border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Course Performance
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Enrollment volume with average assessment score by course
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analytics.coursePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="topic" stroke="#6b7280" />
                <YAxis
                  yAxisId="students"
                  stroke="#10b981"
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="score"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="#3b82f6"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="students"
                  dataKey="students"
                  fill="#10b981"
                  name="Students Enrolled"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="score"
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Avg Score"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Student Performance
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Distribution of student performance levels
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.studentPerformanceData.map((item, index) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        index === 0
                          ? "bg-green-500"
                          : index === 1
                            ? "bg-blue-500"
                            : index === 2
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Tracked Students:</span>{" "}
                {analytics.studentPerformanceData.reduce((sum, item) => sum + item.count, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Distribution is based on average completed assessment scores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Weekly Platform Activity
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Active users by week
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.weeklyActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Platform Signals
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
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
                      <p className="font-semibold text-gray-900 text-sm">
                        {insight.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
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
