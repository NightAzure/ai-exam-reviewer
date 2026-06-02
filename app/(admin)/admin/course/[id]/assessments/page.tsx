import AdminAssessmentsPage from "./admin-assessments";

export default async function AssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminAssessmentsPage id={parseInt(id)} />;
}
