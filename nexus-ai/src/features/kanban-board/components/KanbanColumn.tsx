"use client";

import { useDroppable } from "@dnd-kit/core";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

import type { KanbanTask } from "../types";
import { DraggableTaskCard } from "./TaskCard";

const columnMeta = {
  todo: {
    title: "To-do",
    description: "Sẵn sàng để bắt đầu",
    icon: Circle,
    accent: "bg-slate-500",
    soft: "bg-slate-50/80",
  },
  doing: {
    title: "Doing",
    description: "Đang được thực thi",
    icon: Clock3,
    accent: "bg-amber-500",
    soft: "bg-amber-50/60",
  },
  done: {
    title: "Done",
    description: "Đã hoàn thành",
    icon: CheckCircle2,
    accent: "bg-emerald-500",
    soft: "bg-emerald-50/60",
  },
} satisfies Record<
  TaskStatus,
  {
    title: string;
    description: string;
    icon: typeof Circle;
    accent: string;
    soft: string;
  }
>;

export function KanbanColumn({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: KanbanTask[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });
  const meta = columnMeta[status];
  const Icon = meta.icon;

  return (
    <section
      className={cn(
        "flex min-h-[540px] min-w-0 flex-col rounded-[28px] border border-slate-200/80 p-3 transition duration-200",
        meta.soft,
        isOver && "scale-[1.01] border-violet-400 bg-violet-50 ring-4 ring-violet-100",
      )}
      ref={setNodeRef}
    >
      <header className="flex items-center justify-between px-2 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl text-white shadow-sm",
              meta.accent,
            )}
          >
            <Icon aria-hidden="true" size={17} />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-900">{meta.title}</h2>
            <p className="text-[10px] text-slate-500">{meta.description}</p>
          </div>
        </div>
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200">
          {tasks.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-3">
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 ? (
          <div
            className={cn(
              "flex min-h-32 flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white/50 px-6 text-center text-xs leading-5 text-slate-400",
              isOver && "border-violet-400 bg-white text-violet-600",
            )}
          >
            Kéo task vào đây
          </div>
        ) : (
          <div className="min-h-10 flex-1 rounded-2xl border border-dashed border-transparent" />
        )}
      </div>
    </section>
  );
}
