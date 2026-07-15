"use client";
import { CornerDownLeft, GraduationCap, Settings, Eye, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Course } from "@/types/course";
import { Badge } from "@/components/ui/badge";

interface AdminCourseHeaderProps {
  course: Course;
  courseId: number;
}

export default function AdminCourseHeader({ course, courseId }: AdminCourseHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
      {/* Back button + title */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          onClick={() => router.push("/admin/courses")}
          className="hover:text-muted-foreground size-10 flex items-center justify-center hover:bg-muted rounded-lg transition-colors flex-shrink-0"
        >
          <CornerDownLeft />
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-ink" /> {course.title}
            </h1>
            <Badge variant="secondary" className="text-xs">
              Admin View
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            {course.description}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/course/${course.id}`)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Student View</span>
          <span className="sm:hidden">View</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/course/${courseId}/assessments`)}
          className="gap-2"
        >
          <ClipboardList className="w-4 h-4" />
          <span className="hidden sm:inline">Assessments</span>
          <span className="sm:hidden">Tests</span>
        </Button>
        <Button
          size="sm"
          onClick={() => router.push(`/admin/course/${course.id}/manage`)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Manage Course</span>
          <span className="sm:hidden">Manage</span>
        </Button>
      </div>
    </div>
  );
}
