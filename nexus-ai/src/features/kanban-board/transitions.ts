import type { TaskStatus } from "@/types";

export type KanbanTransitionDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: "pm_required" | "done_required";
      message: string;
    };

export function validateKanbanTransition({
  canManageRework,
  currentStatus,
  nextStatus,
}: {
  canManageRework: boolean;
  currentStatus: TaskStatus;
  nextStatus: TaskStatus;
}): KanbanTransitionDecision {
  const touchesRework =
    currentStatus === "rework" || nextStatus === "rework";

  if (touchesRework && !canManageRework) {
    return {
      allowed: false,
      code: "pm_required",
      message: "Chỉ PM mới có quyền thay đổi trạng thái Rework.",
    };
  }

  if (nextStatus === "rework" && currentStatus !== "done") {
    return {
      allowed: false,
      code: "done_required",
      message: "Task chỉ có thể được PM chuyển từ Done sang Rework.",
    };
  }

  return { allowed: true };
}
