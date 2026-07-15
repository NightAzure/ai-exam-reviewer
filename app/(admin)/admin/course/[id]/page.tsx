import { Suspense } from "react";
import AdminCoursePage from "./admin-course";

export default async function Course({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="space-y-8" aria-busy="true" aria-label="Loading course">
          <div className="h-32 animate-pulse rounded-2xl bg-ink/8 motion-reduce:animate-none" />
          <div className="h-56 animate-pulse rounded-3xl bg-ink/10 motion-reduce:animate-none" />
          <div className="h-96 animate-pulse rounded-3xl bg-ink/8 motion-reduce:animate-none" />
        </div>
      }
    >
      <AdminCoursePage id={parseInt(id, 10)} />
    </Suspense>
  );
}
