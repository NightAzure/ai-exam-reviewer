import { Suspense } from "react";
import Dashboard from "./dashboard";

function DashboardFallback() {
  return (
    <main className="space-y-8 pb-6" aria-busy="true" aria-label="Loading dashboard">
      <header className="flex flex-col gap-5 border-b border-ink/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
          <div className="h-12 w-64 animate-pulse rounded bg-ink/10 motion-reduce:animate-none sm:w-80" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
        </div>
        <div className="h-11 w-36 animate-pulse rounded-xl bg-ink/8 motion-reduce:animate-none" />
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_1px_2px_rgb(24_34_52/0.05)]"
          >
            <div className="h-36 animate-pulse bg-ink/8 motion-reduce:animate-none" />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
                  <div className="h-7 w-3/4 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
                </div>
                <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-ink/8 motion-reduce:animate-none" />
              </div>
              <div className="mt-5 space-y-2 border-y border-ink/8 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
                  <div className="h-6 w-10 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
                </div>
                <div className="h-1.5 w-full animate-pulse rounded-full bg-ink/10 motion-reduce:animate-none" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
              </div>
              <div className="mt-5 h-11 animate-pulse rounded-xl bg-ink/10 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}
