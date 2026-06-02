import Chat from "./chat";

export default async function Home({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Chat courseId={parseInt(id, 10)} />;
}
