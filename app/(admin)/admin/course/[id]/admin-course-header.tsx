"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CirclePause,
  ClipboardList,
  Eye,
  Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Course } from "@/types/course";

interface AdminCourseHeaderProps {
  course: Course;
  courseId: number;
}

export default function AdminCourseHeader({
  course,
  courseId,
}: AdminCourseHeaderProps) {
  const description =
    course.description?.trim() ||
    "Manage members, topics, documents, and assessments for this learning space.";

  return (
    <header className="flex flex-col gap-5 border-b border-ink/10 pb-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 rounded-xl">
              <Link href="/admin/courses" aria-label="Back to course library">
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
              Course Administration
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 font-[family-name:var(--font-display)] text-4xl leading-none tracking-[-0.035em] text-balance text-ink sm:text-5xl">
              {course.title}
            </h1>
            <Badge
              variant={course.isActive ? "proficient" : "secondary"}
              className="gap-1.5"
            >
              {course.isActive ? (
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
              ) : (
                <CirclePause aria-hidden="true" className="size-3.5" />
              )}
              {course.isActive ? "Live for students" : "Paused"}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
            {course.code ? (
              <span className="font-mono text-xs font-semibold tracking-[0.14em] text-ink">
                {course.code}
              </span>
            ) : null}
            {course.code ? <span aria-hidden="true">·</span> : null}
            <span>{course.instructor?.name || "Unassigned instructor"}</span>
          </div>

          <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-slate">
            {description}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <Button asChild variant="outline" className="h-11 justify-center gap-2 rounded-xl">
            <Link href={`/course/${course.id}`}>
              <Eye aria-hidden="true" className="size-4" />
              Student View
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 justify-center gap-2 rounded-xl">
            <Link href={`/admin/course/${courseId}/assessments`}>
              <ClipboardList aria-hidden="true" className="size-4" />
              Assessments
            </Link>
          </Button>
          <Button asChild className="h-11 justify-center gap-2 rounded-xl">
            <Link href={`/admin/course/${course.id}/manage`}>
              <Settings2 aria-hidden="true" className="size-4" />
              Manage Course
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
