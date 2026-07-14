import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import JoinClassDialog from "./join-class-dialog";

export function DashboardHeader({
  courseCount,
  isLoading = false,
}: {
  courseCount: number;
  isLoading?: boolean;
}) {
  const courseLabel = `${courseCount} ${courseCount === 1 ? "course" : "courses"}`;

  return (
    <header className="flex flex-col gap-5 border-b border-[#24334c]/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8e3039]">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Your Review Space
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none tracking-[-0.035em] text-[#18243a] sm:text-5xl">
          My Courses
        </h1>
        <p className="mt-3 text-sm text-[#647087]">
          {isLoading
            ? "Preparing your courses and study signals…"
            : courseCount > 0
            ? `${courseLabel} ready for your next focused session.`
            : "Join a class to build your personal review space."}
        </p>
      </div>

      <JoinClassDialog
        trigger={
          <Button
            variant="outline"
            className="h-11 rounded-xl border-[#24334c]/15 bg-white px-4 text-[#18243a] shadow-sm hover:bg-[#18243a]/[0.03]"
          >
            <Plus aria-hidden="true" className="size-4" />
            Join a Class
          </Button>
        }
      />
    </header>
  );
}
