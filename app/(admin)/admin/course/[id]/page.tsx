import AdminCoursePage from "./admin-course";

export default async function Course({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCoursePage id={parseInt(id)} />;
}
