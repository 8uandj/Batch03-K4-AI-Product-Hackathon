import {
  buildWorkloadAnalysis,
  type WorkloadTask,
} from "../eq-radar/analysis.ts";

export type ProactiveCheckInKind = "rework" | "overdue" | "overload";

export type ProactiveCheckIn = {
  id: string;
  kind: ProactiveCheckInKind;
  severity: "warning" | "critical";
  title: string;
  message: string;
  detail: string;
  activeTasks: number;
  task?: {
    id: string;
    title: string;
    dueAt: string | null;
    daysOverdue?: number;
    deadlineLabel?: string;
  };
};

export type CheckInTask = WorkloadTask & {
  id: string;
};

type CheckInInput = {
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  tasks: readonly CheckInTask[];
  now?: Date;
};

function safeDisplayName(value: string) {
  const trimmed = value.trim();
  return trimmed || "bạn";
}

function shortTitle(value: string) {
  const trimmed = value.trim() || "Task chưa đặt tên";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatHours(totalHours: number) {
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days === 0) return `${hours} giờ`;
  if (hours === 0) return `${days} ngày`;
  return `${days} ngày ${hours} giờ`;
}

function deadlineLabel(value: string | null | undefined, now: Date) {
  const dueAt = validDate(value);
  if (!dueAt) return "Chưa có deadline";

  const differenceHours = Math.max(
    1,
    Math.ceil(Math.abs(dueAt.getTime() - now.getTime()) / (60 * 60 * 1000)),
  );

  return dueAt.getTime() >= now.getTime()
    ? `Còn ${formatHours(differenceHours)}`
    : `Đã quá hạn ${formatHours(differenceHours)}`;
}

export function selectProactiveCheckIn({
  projectId,
  projectName,
  userId,
  userName,
  tasks,
  now = new Date(),
}: CheckInInput): ProactiveCheckIn | null {
  const openTasks = tasks.filter((task) => task.status !== "done");
  const name = safeDisplayName(userName);
  const normalizedProjectName = shortTitle(projectName);
  const reworkTasks = openTasks
    .filter((task) => task.status === "rework")
    .sort((left, right) => {
      const leftUpdatedAt = validDate(left.updated_at)?.getTime() ?? 0;
      const rightUpdatedAt = validDate(right.updated_at)?.getTime() ?? 0;
      return rightUpdatedAt - leftUpdatedAt;
    });
  const firstRework = reworkTasks[0];

  if (firstRework) {
    const taskTitle = shortTitle(firstRework.title);
    const dueAt = validDate(firstRework.due_at);
    const remaining = deadlineLabel(firstRework.due_at, now);

    return {
      id: [
        "rework",
        projectId,
        userId,
        firstRework.id,
        firstRework.updated_at ?? firstRework.due_at ?? "no-date",
      ].join(":"),
      kind: "rework",
      severity:
        dueAt && dueAt.getTime() < now.getTime() ? "critical" : "warning",
      title: "PM yêu cầu rework một task",
      message: `Chào ${name}, task “${taskTitle}” trong dự án “${normalizedProjectName}” đã được PM chuyển sang Rework vì cần hoàn thiện thêm.`,
      detail: `Task: “${taskTitle}” · Dự án: “${normalizedProjectName}” · Deadline: ${remaining}${
        reworkTasks.length > 1
          ? ` · Bạn còn ${reworkTasks.length - 1} task Rework khác`
          : ""
      }.`,
      activeTasks: openTasks.length,
      task: {
        id: firstRework.id,
        title: taskTitle,
        dueAt: dueAt?.toISOString() ?? null,
        deadlineLabel: remaining,
      },
    };
  }

  const overdueTasks = openTasks
    .map((task) => ({ task, dueAt: validDate(task.due_at) }))
    .filter(
      (item): item is { task: CheckInTask; dueAt: Date } =>
        Boolean(item.dueAt && item.dueAt.getTime() < now.getTime()),
    )
    .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());

  const firstOverdue = overdueTasks[0];

  if (firstOverdue) {
    const daysOverdue = Math.max(
      1,
      Math.ceil(
        (now.getTime() - firstOverdue.dueAt.getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    const taskTitle = shortTitle(firstOverdue.task.title);

    return {
      id: [
        "overdue",
        projectId,
        userId,
        firstOverdue.task.id,
        firstOverdue.dueAt.toISOString(),
      ].join(":"),
      kind: "overdue",
      severity: daysOverdue >= 3 ? "critical" : "warning",
      title: "Nexus thấy một deadline đã trễ",
      message: `Chào ${name}, task “${taskTitle}” đã quá hạn ${daysOverdue} ngày. Bạn đang gặp blocker hay cần điều chỉnh phạm vi hoặc ưu tiên không?`,
      detail:
        overdueTasks.length > 1
          ? `Bạn còn ${overdueTasks.length - 1} task quá hạn khác. Mình đề xuất xử lý task cũ nhất trước.`
          : "Một cập nhật ngắn về blocker sẽ giúp PM hỗ trợ đúng chỗ.",
      activeTasks: openTasks.length,
      task: {
        id: firstOverdue.task.id,
        title: taskTitle,
        dueAt: firstOverdue.dueAt.toISOString(),
        daysOverdue,
      },
    };
  }

  const workload = buildWorkloadAnalysis(openTasks, now);
  if (workload.level !== "high") return null;

  const highestPriorityTitles = openTasks
    .filter((task) => task.priority === "high")
    .slice(0, 2)
    .map((task) => shortTitle(task.title));
  const priorityDetail = highestPriorityTitles.length
    ? `Ưu tiên cao hiện có: ${highestPriorityTitles.join(", ")}.`
    : "Hãy chốt một đầu việc quan trọng nhất trước khi nhận thêm task.";

  return {
    id: [
      "overload",
      projectId,
      userId,
      workload.score,
      openTasks
        .map((task) => task.id)
        .sort()
        .join(","),
    ].join(":"),
    kind: "overload",
    severity: workload.score >= 80 ? "critical" : "warning",
    title: "Nexus muốn kiểm tra tải việc của bạn",
    message: `Chào ${name}, dữ liệu hiện có cho thấy tải việc ở mức cao: ${workload.activeTasks} task đang mở, ${workload.doingTasks} task đang Doing. Bạn có muốn rà lại ưu tiên hoặc nhờ PM hỗ trợ không?`,
    detail: priorityDetail,
    activeTasks: workload.activeTasks,
  };
}
