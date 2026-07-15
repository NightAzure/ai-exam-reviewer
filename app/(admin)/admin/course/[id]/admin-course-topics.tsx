"use client";

import Link from "next/link";
import { BookOpen, Layers3, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Course } from "@/types/course";

const number = new Intl.NumberFormat("en-PH");

interface AdminCourseTopicsProps {
  course: Course;
  courseId: number;
}

export default function AdminCourseTopics({ course, courseId }: AdminCourseTopicsProps) {
  const topics = course.topics ?? [];
  const subtopicTotal = topics.reduce(
    (sum, topic) => sum + (topic.subtopics?.length ?? 0),
    0,
  );

  return (
    <Card className="rounded-3xl border-ink/10 bg-surface shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
              Topic coverage
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">Authoring structure</h2>
            <p className="mt-1 text-xs leading-5 text-slate">
              Topics organize practice and assessments. Mastery signals appear only after students
              complete scored work.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-ink/10 bg-canvas/70 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate">
              <BookOpen aria-hidden="true" className="size-3.5" />
              Topics
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none tabular-nums text-ink">
              {number.format(topics.length)}
            </p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-canvas/70 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate">
              <ListTree aria-hidden="true" className="size-3.5" />
              Subtopics
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none tabular-nums text-ink">
              {number.format(subtopicTotal)}
            </p>
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-canvas/40 px-4 py-8 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-ink text-canvas">
              <Layers3 aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">No topics yet</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-slate">
              Create topics so assessments and practice can map to the course outline.
            </p>
            <Button asChild className="mt-4 h-11 rounded-xl">
              <Link href={`/admin/course/${courseId}/manage`}>Add Topics</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10">
            {topics.map((topic) => {
              const subtopicCount = topic.subtopics?.length ?? 0;
              return (
                <li key={topic.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{topic.name}</p>
                    <p className="mt-0.5 text-xs text-slate">
                      {subtopicCount === 0
                        ? "No subtopics yet"
                        : `${number.format(subtopicCount)} subtopic${subtopicCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-ink/10 bg-ink/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate">
                    Outline ready
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {topics.length > 0 ? (
          <Button asChild variant="outline" className="h-11 w-full rounded-xl">
            <Link href={`/admin/course/${courseId}/manage`}>Manage Topics</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
