"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Sparkles,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";

import type { TaskStatus } from "@/types";

import type { KanbanBoardData, KanbanTask } from "../types";
import { AutoTaskingDialog } from "./AutoTaskingDialog";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardPreview } from "./TaskCard";

const statuses: TaskStatus[] = ["todo", "doing", "done"];

type ToastState = {
  tone: "success" | "warning" | "error";
  message: string;
};

export function KanbanBoard({ initialData }: { initialData: KanbanBoardData }) {
  const [tasks, setTasks] = useState(initialData.tasks);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [showAutoTasking, setShowAutoTasking] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const tasksByStatus = useMemo(
    () =>
      Object.fromEntries(
        statuses.map((status) => [
          status,
          tasks.filter((task) => task.status === status),
        ]),
      ) as Record<TaskStatus, KanbanTask[]>,
    [tasks],
  );
  const completion = tasks.length
    ? Math.round((tasksByStatus.done.length / tasks.length) * 100)
    : 0;

  function onDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(event.active.id);
    const nextStatus = event.over?.data.current?.status as TaskStatus | undefined;
    const currentTask = tasks.find((task) => task.id === taskId);

    if (!currentTask || !nextStatus || currentTask.status === nextStatus) return;

    const previousTasks = tasks;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status: nextStatus, updatedAt: new Date().toISOString() }
          : task,
      ),
    );

    if (initialData.dataSource === "mock") {
      setToast({ tone: "success", message: "Đã cập nhật task trong mock state." });
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${initialData.projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật task.");
      setToast({ tone: "success", message: "Trạng thái task đã đồng bộ Supabase." });
    } catch (error) {
      setTasks(previousTasks);
      setToast({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Không thể cập nhật task.",
      });
    }
  }

  function addGeneratedTasks(
    generated: KanbanTask[],
    mode: "openai" | "mock",
    warning?: string,
  ) {
    setTasks((current) => [...generated, ...current]);
    setToast({
      tone: warning ? "warning" : "success",
      message:
        warning ||
        `${generated.length} task đã được tạo bằng ${
          mode === "openai" ? "OpenAI" : "mock generator"
        }.`,
    });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-800 px-6 py-7 text-white shadow-2xl shadow-violet-200/50 sm:px-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200 ring-1 ring-white/15">
                Workflow command center
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/70 ring-1 ring-white/15">
                {initialData.dataSource === "mock" ? "Demo data" : "Supabase live"}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {initialData.projectName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
              Kéo thả task để cập nhật luồng thực thi. Nexus AI có thể đọc project
              brief, đối chiếu kỹ năng và đề xuất phân công trong vài giây.
            </p>
          </div>

          <button
            className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-violet-800 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
            disabled={!initialData.canAutoTask}
            onClick={() => setShowAutoTasking(true)}
            title={
              initialData.canAutoTask
                ? "Tạo task bằng AI"
                : "Chỉ PM mới có thể chạy Auto-Tasking"
            }
            type="button"
          >
            <WandSparkles
              aria-hidden="true"
              className="transition group-hover:rotate-12"
              size={18}
            />
            AI Auto-Tasking
          </button>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<Circle aria-hidden="true" size={16} />}
            label="To-do"
            value={tasksByStatus.todo.length}
          />
          <Metric
            icon={<Clock3 aria-hidden="true" size={16} />}
            label="Doing"
            value={tasksByStatus.doing.length}
          />
          <Metric
            icon={<CheckCircle2 aria-hidden="true" size={16} />}
            label="Done"
            value={tasksByStatus.done.length}
          />
          <Metric
            icon={<UsersRound aria-hidden="true" size={16} />}
            label="Hoàn thành"
            value={`${completion}%`}
          />
        </div>
      </section>

      {toast ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            toast.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : toast.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role="status"
        >
          <span className="flex items-center gap-2">
            <Sparkles aria-hidden="true" size={16} />
            {toast.message}
          </span>
          <button
            aria-label="Đóng thông báo"
            className="rounded-lg p-1 hover:bg-white/60"
            onClick={() => setToast(null)}
            type="button"
          >
            <X aria-hidden="true" size={15} />
          </button>
        </div>
      ) : null}

      <DndContext
        collisionDetection={closestCorners}
        onDragCancel={() => setActiveTask(null)}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        sensors={sensors}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {statuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeTask ? <TaskCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {showAutoTasking ? (
        <AutoTaskingDialog
          initialSummary={initialData.documentSummary}
          members={initialData.members}
          onClose={() => setShowAutoTasking(false)}
          onCreated={addGeneratedTasks}
          projectId={initialData.projectId}
        />
      ) : null}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
      <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
          {label}
        </p>
        <p className="text-xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}
