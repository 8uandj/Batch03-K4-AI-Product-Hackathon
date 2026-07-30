import { ChatHub } from "@/features/workspace/components/ChatHub";

type TeamChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeamChatPage({ params }: TeamChatPageProps) {
  const { id } = await params;

  return <ChatHub active="team" projectId={id} />;
}
