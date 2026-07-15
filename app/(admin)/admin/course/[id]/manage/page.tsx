import { Suspense } from "react";
import ManageCoursePage from "./manage-course";

export default async function ManageCourse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<div>Loading course...</div>}>
      <ManageCoursePage id={id} />
    </Suspense>
  );
}
