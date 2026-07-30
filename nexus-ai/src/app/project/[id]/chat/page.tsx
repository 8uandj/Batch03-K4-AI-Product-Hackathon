import { ChatHub } from "@/features/workspace/components/ChatHub";

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  return <ChatHub projectId={id} />;
}
