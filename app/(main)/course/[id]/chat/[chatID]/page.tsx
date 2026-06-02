import Chat from "../chat";

interface ChatProps {
  params: Promise<{
    id: string;
    chatID: string;
  }>;
}

export default async function ChatPage({ params }: ChatProps) {
  const { id, chatID } = await params;
  return <Chat courseId={parseInt(id, 10)} activeChatId={chatID} />;
}
