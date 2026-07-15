"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AdminCoursesHeaderProps = {
  total: number;
  active: number;
  isLoading?: boolean;
};

export default function AdminCoursesHeader({
  total,
  active,
  isLoading = false,
}: AdminCoursesHeaderProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const resetCreateForm = () => {
    setCourseTitle("");
    setCourseCode("");
    setCourseDescription("");
    setCreateError(null);
    setIsCreating(false);
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      resetCreateForm();
    }
  };

  const handleCreateCourse = async () => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/admin/course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: courseTitle,
          code: courseCode,
          description: courseDescription,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Unable to create course",
        );
      }

      await mutate("courses");
      setIsCreateOpen(false);
      resetCreateForm();

      const nextCourseId =
        payload &&
        typeof payload === "object" &&
        "course" in payload &&
        payload.course &&
        typeof payload.course === "object" &&
        "id" in payload.course
          ? Number(payload.course.id)
          : NaN;

      if (Number.isFinite(nextCourseId)) {
        router.push(`/admin/course/${nextCourseId}/manage`);
        return;
      }

      router.refresh();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create course");
    } finally {
      setIsCreating(false);
    }
  };

  const courseLabel = `${total} ${total === 1 ? "course" : "courses"}`;

  return (
    <>
      <header className="flex flex-col gap-5 border-b border-ink/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Administration
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none tracking-[-0.035em] text-ink sm:text-5xl">
            Courses
          </h1>
          <p className="mt-3 text-sm text-slate">
            {isLoading
              ? "Preparing your course library…"
              : total > 0
                ? `${active} active of ${courseLabel} ready to manage.`
                : "Create a course to set up learning spaces for your students."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCreateOpen(true)}
          className="h-11 rounded-xl border-ink/15 bg-white px-4 text-ink shadow-sm hover:bg-ink/[0.03]"
        >
          <Plus aria-hidden="true" className="size-4" />
          Create Course
        </Button>
      </header>

      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
            <DialogDescription>
              Set up the core course details now. You can finish topics, members, and documents on the manage screen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">Course Title</Label>
              <Input
                id="course-title"
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Engineering Mathematics"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-code">Course Code</Label>
              <Input
                id="course-code"
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value.toUpperCase())}
                placeholder="Leave blank to auto-generate"
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                Use a memorable code, or leave this blank and a unique code will be generated automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                value={courseDescription}
                onChange={(event) => setCourseDescription(event.target.value)}
                placeholder="Describe the scope, audience, or learning goals."
                disabled={isCreating}
              />
            </div>

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleCreateOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateCourse()}
              disabled={isCreating || !courseTitle.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create and Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
