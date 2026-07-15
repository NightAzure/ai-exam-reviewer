import { Skeleton } from "@/components/ui/skeleton";

export default function CourseCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-sm">
      <Skeleton className="h-36 w-full rounded-none bg-ink/10" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4 bg-ink/10" />
          <Skeleton className="h-3 w-1/2 bg-ink/8" />
        </div>

        <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4 space-y-3">
          <Skeleton className="h-3 w-1/3 bg-ink/8" />
          <Skeleton className="h-1.5 w-full rounded-full bg-ink/10" />
          <Skeleton className="h-3 w-2/5 bg-ink/8" />
        </div>

        <Skeleton className="mt-auto h-11 w-full rounded-xl bg-ink/10" />
      </div>
    </div>
  );
}
