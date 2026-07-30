import { ChatHub } from "@/features/workspace/components/ChatHub";

type BotChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BotChatPage({ params }: BotChatPageProps) {
  const { id } = await params;

  return <ChatHub active="bot" projectId={id} />;
}
