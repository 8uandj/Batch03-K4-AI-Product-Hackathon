import { notFound } from "next/navigation";

import { KanbanBoard } from "@/features/kanban-board/components/KanbanBoard";
import { getKanbanBoardData } from "@/features/kanban-board/data";

type BoardPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;
  const data = await getKanbanBoardData(id);

  if (!data) notFound();

  return <KanbanBoard initialData={data} />;
}
