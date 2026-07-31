import { notFound, redirect } from "next/navigation";
import { ChatHub } from "@/features/workspace/components/ChatHub";

type BotChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BotChatPage({ params }: BotChatPageProps) {
  const { id } = await params;

  if (id === "demo") {
    redirect("/project");
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  return <ChatHub active="bot" projectId={id} />;
}
