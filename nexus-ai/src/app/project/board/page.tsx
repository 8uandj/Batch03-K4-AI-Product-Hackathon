import { KanbanProjectPicker } from "@/features/kanban-board/components/KanbanProjectPicker";
import { getCurrentUserProjects } from "@/features/workspace/data";

export const dynamic = "force-dynamic";

export default async function KanbanBoardChoosePage() {
  const projects = await getCurrentUserProjects();
  return <KanbanProjectPicker projects={projects} />;
}
