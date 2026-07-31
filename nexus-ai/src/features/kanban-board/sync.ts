import type { TaskStatus } from "@/types";

import type { KanbanTask } from "./types";

const taskStatuses: TaskStatus[] = ["todo", "doing", "done"];

export type TaskStatusUpdate = {
  id: string;
  status: unknown;
  updatedAt?: string;
};

function timestamp(value: string | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function applyKanbanTaskStatusUpdate(
  tasks: KanbanTask[],
  update: TaskStatusUpdate,
) {
  if (!taskStatuses.includes(update.status as TaskStatus)) return tasks;

  let matched = false;
  const nextTasks = tasks.map((task) => {
    if (task.id !== update.id) return task;

    matched = true;
    const incomingTimestamp = timestamp(update.updatedAt);
    const currentTimestamp = timestamp(task.updatedAt);

    if (
      incomingTimestamp !== null &&
      currentTimestamp !== null &&
      incomingTimestamp < currentTimestamp
    ) {
      return task;
    }

    if (
      task.status === update.status &&
      (update.updatedAt === undefined || task.updatedAt === update.updatedAt)
    ) {
      return task;
    }

    return {
      ...task,
      status: update.status as TaskStatus,
      updatedAt: update.updatedAt ?? task.updatedAt,
    };
  });

  return matched ? nextTasks : tasks;
}

export function applyKanbanTaskStatusSnapshot(
  tasks: KanbanTask[],
  updates: TaskStatusUpdate[],
) {
  return updates.reduce(applyKanbanTaskStatusUpdate, tasks);
}
