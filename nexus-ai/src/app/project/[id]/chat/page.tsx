import { RagWorkspace } from "@/features/document-rag/components/RagWorkspace";

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  return <RagWorkspace projectId={id} />;
}
