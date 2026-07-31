"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

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

export function DraggableTaskCard({ task }: { task: KanbanTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status, task },
  });

  return (
    <article
      className={cn(
        "group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_40px_rgba(15,23,42,0.10)]",
        isDragging && "opacity-30",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <TaskCardContent
        dragHandle={
          <button
            aria-label={`Kéo task ${task.title}`}
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-400"
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" size={17} />
          </button>
        }
        task={task}
      />
    </article>
  );
}
export function TaskCardPreview({ task }: { task: KanbanTask }) {
  return (
    <article className="w-[320px] rotate-2 rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl">
      <TaskCardContent task={task} />
    </article>
  );
}

function TaskCardContent({
  dragHandle,
  task,
}: {
  dragHandle?: React.ReactNode;
  task: KanbanTask;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
            priorityStyle[task.priority],
          )}
        >
          {priorityLabel[task.priority]}
        </span>
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
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-slate-400">
            <CalendarDays aria-hidden="true" size={12} />
            {formatDueDate(task.dueAt)}
          </span>
        ) : null}
      </div>
    </>
  );
}
