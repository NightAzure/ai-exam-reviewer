import { Skeleton } from "@/components/ui/skeleton";

export default function CourseCardSkeleton() {
  return (
    <div className="rounded-xl border border-primary/10 overflow-hidden bg-card flex flex-col gap-4 pb-5">
      {/* Thumbnail */}
      <Skeleton className="h-32 w-full rounded-none" />

      {/* Header */}
      <div className="px-4 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md shrink-0 ml-2" />
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 space-y-1.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>

      {/* Button */}
      <div className="px-4">
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </div>
  );
}
