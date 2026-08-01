"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CircleHelp, GripVertical, LockKeyhole, MessageCircleWarning } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatOverdueDuration,
  getOverdueHours,
} from "@/features/deadline-monitor/rules";

import type { KanbanTask } from "../types";

const priorityStyle = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  high: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};

const priorityLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function DraggableTaskCard({
  disabled = false,
  onAction,
  task,
}: {
  disabled?: boolean;
  onAction?: (task: KanbanTask, action: "blocker_reported" | "support_requested") => void;
  task: KanbanTask;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status, task },
    disabled,
  });
  const overdueHours = getOverdueHours(task);

  return (
    <article
      className={cn(
        "group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_40px_rgba(15,23,42,0.10)]",
        overdueHours !== null &&
          "border-rose-300 bg-gradient-to-br from-white to-rose-50/70 ring-1 ring-rose-100",
        isDragging && "opacity-30",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <TaskCardContent
        dragHandle={
          disabled ? (
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-rose-600"
              title="Chỉ PM có thể thay đổi task Rework"
            >
              <LockKeyhole aria-hidden="true" size={11} />
              PM only
            </span>
          ) : (
            <button
              aria-label={`Kéo task ${task.title}`}
              className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-400"
              type="button"
              suppressHydrationWarning
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden="true" size={17} />
            </button>
          )
        }
        overdueHours={overdueHours}
        onAction={onAction}
        task={task}
      />
    </article>
  );
}
export function TaskCardPreview({ task }: { task: KanbanTask }) {
  const overdueHours = getOverdueHours(task);

  return (
    <article className="w-[320px] rotate-2 rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl">
      <TaskCardContent overdueHours={overdueHours} task={task} />
    </article>
  );
}

function TaskCardContent({
  dragHandle,
  onAction,
  overdueHours,
  task,
}: {
  dragHandle?: React.ReactNode;
  onAction?: (task: KanbanTask, action: "blocker_reported" | "support_requested") => void;
  overdueHours: number | null;
  task: KanbanTask;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
              priorityStyle[task.priority],
            )}
          >
            {priorityLabel[task.priority]}
          </span>
          {task.status === "rework" && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200">
              ⚠️ Rework
            </span>
          )}
        </div>
        {dragHandle}
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-6 text-slate-900">
        {task.title}
      </h3>
      {task.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
          {task.description}
        </p>
      ) : null}
      {task.acceptanceCriteria ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-emerald-700">
          <span className="font-bold">Đạt khi:</span> {task.acceptanceCriteria}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {task.requiredSkills.length ? (
          task.requiredSkills.slice(0, 3).map((skill) => (
            <span
              className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700"
              key={skill}
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-400">
            Chưa gắn skill
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-label={`Phụ trách: ${task.assigneeName}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-[10px] font-black text-white ring-2 ring-white"
            title={task.assigneeName}
          >
            {initials(task.assigneeName)}
          </span>
          <span className="truncate text-[11px] font-semibold text-slate-600">
            {task.assigneeName}
          </span>
        </div>
        {task.dueAt ? (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 text-[10px] font-medium text-slate-400",
              overdueHours !== null && "font-bold text-rose-600",
            )}
          >
            <CalendarDays aria-hidden="true" size={12} />
            {overdueHours === null
              ? formatDueDate(task.dueAt)
              : `Trễ ${formatOverdueDuration(overdueHours)}`}
          </span>
        ) : null}
      </div>
      {onAction && task.status !== "done" ? (
        <div className="mt-3 flex gap-2">
          <button className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100" onClick={() => onAction(task, "blocker_reported")} type="button"><MessageCircleWarning size={12} /> Báo blocker</button>
          <button className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-[10px] font-bold text-cyan-700 hover:bg-cyan-100" onClick={() => onAction(task, "support_requested")} type="button"><CircleHelp size={12} /> Cần hỗ trợ</button>
        </div>
      ) : null}
    </>
  );
}
