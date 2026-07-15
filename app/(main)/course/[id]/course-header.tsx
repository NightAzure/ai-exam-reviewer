"use client"
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Course } from "@/types/course";

interface CourseHeaderProps{
  course: Course;
  studyState: string;
}

export default function CourseHeader({ course, studyState }: CourseHeaderProps) {
  const router = useRouter();

  return (
    <header className="border-b border-ink/10 pb-6">
      <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate transition-[background-color,color] hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/50"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Courses
          </button>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
              Course Workspace
            </p>
          </div>
          <h1 className="mt-2 text-pretty font-[family-name:var(--font-display)] text-3xl leading-none tracking-[-0.035em] text-ink sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            {course.description || "Choose a focused next step and build your evidence topic by topic."}
          </p>
          <p className="mt-3 text-sm font-semibold text-ink">{studyState}</p>
      </div>
    </header>
  );
}
