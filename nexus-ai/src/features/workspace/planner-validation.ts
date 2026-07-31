import type { TaskPriority } from "@/types";

export type PlannerTaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id: string;
  required_skills: string[];
  due_in_days: number;
};

export class PlannerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerValidationError";
  }
}

const priorities: TaskPriority[] = ["low", "medium", "high"];

export function buildPlannerDocumentContext(
  summary: string | null | undefined,
  documents: Array<{ filename: string; content: string }>,
  fallback: string,
) {
  const cleanSummary = summary?.trim();
  if (cleanSummary) return cleanSummary.slice(0, 12000);

  const documentContext = documents
    .map(({ filename, content }) => {
      const cleanContent = content.trim();
      return cleanContent ? `[${filename}]\n${cleanContent}` : "";
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12000);

  return documentContext || fallback.trim() || "Dự án chưa có mô tả.";
}

export function validatePlannerTasks(
  value: unknown,
  memberIds: Iterable<string>,
  options: { maxDueDays?: number; maxTasks?: number } = {},
): PlannerTaskDraft[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PlannerValidationError("Kế hoạch phải có ít nhất một task.");
  }

  const maxTasks = options.maxTasks ?? 50;
  if (value.length > maxTasks) {
    throw new PlannerValidationError(`Kế hoạch chỉ được có tối đa ${maxTasks} task.`);
  }

  const allowedMembers = new Set(memberIds);
  const maxDueDays = Math.max(1, Math.floor(options.maxDueDays ?? 365));

  return value.map((rawTask, index) => {
    if (!rawTask || typeof rawTask !== "object") {
      throw new PlannerValidationError(`Task #${index + 1} không hợp lệ.`);
    }

    const task = rawTask as Record<string, unknown>;
    const title = typeof task.title === "string" ? task.title.trim() : "";
    const description =
      typeof task.description === "string" ? task.description.trim() : "";
    const priority = task.priority;
    const assigneeId =
      typeof task.assignee_id === "string" ? task.assignee_id.trim() : "";
    const dueInDays = Number(task.due_in_days);

    if (!title) {
      throw new PlannerValidationError(`Task #${index + 1} chưa có tên.`);
    }
    if (!priorities.includes(priority as TaskPriority)) {
      throw new PlannerValidationError(`Task "${title}" có độ ưu tiên không hợp lệ.`);
    }
    if (!allowedMembers.has(assigneeId)) {
      throw new PlannerValidationError(
        `Người được giao task "${title}" không thuộc project.`,
      );
    }
    if (
      !Number.isInteger(dueInDays) ||
      dueInDays < 1 ||
      dueInDays > maxDueDays
    ) {
      throw new PlannerValidationError(
        `Deadline của task "${title}" phải từ 1 đến ${maxDueDays} ngày.`,
      );
    }

    const requiredSkills = Array.isArray(task.required_skills)
      ? Array.from(
          new Set(
            task.required_skills
              .filter((skill): skill is string => typeof skill === "string")
              .map((skill) => skill.trim())
              .filter(Boolean),
          ),
        ).slice(0, 20)
      : [];

    return {
      title: title.slice(0, 160),
      description: description.slice(0, 1200),
      priority: priority as TaskPriority,
      assignee_id: assigneeId,
      required_skills: requiredSkills,
      due_in_days: dueInDays,
    };
  });
}
