import { Suspense } from "react";
import Dashboard from "./dashboard";

function DashboardFallback() {
  return (
    <div className="space-y-8">
      <div className="h-32 animate-pulse border-b border-ink/10 motion-reduce:animate-none" />
      <div className="h-72 animate-pulse rounded-3xl bg-ink/8 motion-reduce:animate-none" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[430px] animate-pulse rounded-2xl bg-white shadow-sm motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}
