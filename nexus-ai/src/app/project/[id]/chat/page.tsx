import { notFound, redirect } from "next/navigation";
import { ChatHub } from "@/features/workspace/components/ChatHub";

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  if (id === "demo") {
    redirect("/project");
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  return <ChatHub projectId={id} />;
}
