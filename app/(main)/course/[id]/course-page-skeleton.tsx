import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function DarkPulse({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-white/10 motion-reduce:animate-none", className)}
    />
  );
}

export default function CoursePageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading course">
      <header className="border-b border-ink/10 pb-6">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="mt-4 h-3 w-32" />
        <Skeleton className="mt-2 h-10 w-3/4 max-w-xl sm:h-12" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <article className="relative overflow-hidden rounded-3xl bg-ink p-6 shadow-[0_18px_40px_rgb(24_36_58/0.18)] sm:p-7">
          <DarkPulse className="h-3 w-28" />
          <DarkPulse className="mt-3 h-9 w-4/5 max-w-md" />
          <DarkPulse className="mt-3 h-4 w-full max-w-xl" />
          <DarkPulse className="mt-2 h-4 w-3/4 max-w-lg" />
          <DarkPulse className="mt-6 h-11 w-40 rounded-xl" />
          <div className="mt-6 border-t border-white/10 pt-4">
            <DarkPulse className="h-3 w-64 max-w-full" />
          </div>
        </article>

        <aside className="relative overflow-hidden rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-48 sm:h-9" />
            </div>
            <Skeleton className="size-11 shrink-0 rounded-2xl" />
          </div>
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-xs" />
          <Skeleton className="mt-6 h-11 w-36 rounded-xl" />
        </aside>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.4fr)]">
        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-1 h-8 w-56 sm:h-9" />
            <Skeleton className="mt-2 h-3 w-64 max-w-full" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-sm" />
                  <Skeleton className="h-4 w-4/5 max-w-xs" />
                </div>
                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                  <Skeleton className="h-11 w-24 rounded-xl" />
                  <Skeleton className="h-11 w-28 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-1 h-8 w-56 sm:h-9" />
          </div>

          <div className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-ink/10 bg-ink/[0.05] p-1">
            <div className="rounded-lg bg-oxblood py-2.5 shadow-sm">
              <Skeleton className="mx-auto h-4 w-24 bg-white/20" />
            </div>
            <div className="rounded-lg py-2.5">
              <Skeleton className="mx-auto h-4 w-14" />
            </div>
          </div>

          <div className="mt-2 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
            <div className="border-b border-ink/10 px-6 py-5">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-7 w-44" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 px-6 py-10">
              <Skeleton className="size-8 rounded" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
