import { notFound, redirect } from "next/navigation";

import { KanbanBoard } from "@/features/kanban-board/components/KanbanBoard";
import { getKanbanBoardData } from "@/features/kanban-board/data";

type BoardPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;

  if (id === "demo") {
    redirect("/project/board");
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const data = await getKanbanBoardData(id);

  if (!data) notFound();

  return <KanbanBoard initialData={data} />;
}
