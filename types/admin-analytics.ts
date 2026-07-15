export interface DashboardMetricPoint {
  label: string;
  total: number;
  active: number;
}

export interface DashboardCoursePerformancePoint {
  courseId: number;
  topic: string;
  avgScore: number;
  students: number;
  completedAttempts: number;
  isActive: boolean;
}

export interface DashboardDistributionPoint {
  category: string;
  count: number;
  percentage: number;
}

export interface DashboardCompletionPoint {
  [key: string]: string | number;
  name: string;
  value: number;
  fill: string;
}

export interface DashboardQuickInsight {
  title: string;
  description: string;
  tone: "success" | "warning" | "info" | "highlight";
}

export interface AdminDashboardAnalytics {
  totalUsers: number;
  totalUsersGrowth: number;
  totalCourses: number;
  totalCoursesGrowth: number;
  assessments: number;
  assessmentsGrowth: number;
  messages: number;
  messagesGrowth: number;
  completedAttempts: number;
  atRiskStudents: number;
  avgTimeSpentHours: number;
  activeUsersToday: number;
  userGrowthData: DashboardMetricPoint[];
  weeklyActivityData: Array<{ label: string; activeUsers: number }>;
  assessmentCompletionData: DashboardCompletionPoint[];
  coursePerformanceData: DashboardCoursePerformancePoint[];
  studentPerformanceData: DashboardDistributionPoint[];
  quickInsights: DashboardQuickInsight[];
}

export interface CourseRecentActivity {
  student: string;
  action: string;
  time: string;
  type: "success" | "warning" | "info";
}

export interface AdminCourseAnalytics {
  totalEnrolled: number;
  averageScore: number;
  completionRate: number;
  activeToday: number;
  studentsByStatus: {
    excellent: number;
    onTrack: number;
    atRisk: number;
    needsHelp: number;
  };
  recentActivity: CourseRecentActivity[];
}
