import type { KanbanTask } from "./types";

export type KanbanBoardScope = "personal" | "team";

export function filterKanbanTasksByScope(
  tasks: KanbanTask[],
  scope: KanbanBoardScope,
  currentUserId: string,
) {
  if (scope === "team") return tasks;

  return tasks.filter((task) => task.assigneeId === currentUserId);
}
