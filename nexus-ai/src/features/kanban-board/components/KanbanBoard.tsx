"use client";

import { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  Circle,
  Clock3,
  HeartHandshake,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserRound,
  UsersRound,
  WandSparkles,
  Plus,
  X,
} from "lucide-react";

import type { TaskStatus } from "@/types";
import { getOverdueHours } from "@/features/deadline-monitor/rules";
import { createClient } from "@/lib/supabase/client";

import {
  filterKanbanTasksByScope,
  type KanbanBoardScope,
} from "../scope";
import {
  applyKanbanTaskStatusSnapshot,
  applyKanbanTaskStatusUpdate,
} from "../sync";
import { validateKanbanTransition } from "../transitions";
import type { KanbanBoardData, KanbanTask } from "../types";
import { AutoTaskingDialog } from "./AutoTaskingDialog";
import { ManualTaskDialog } from "./ManualTaskDialog";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardPreview } from "./TaskCard";

const statuses: TaskStatus[] = ["todo", "doing", "done", "rework"];

type ToastState = {
  tone: "success" | "warning" | "error";
  message: string;
};

type LiveSyncStatus = "connecting" | "live" | "offline";

export function KanbanBoard({ initialData }: { initialData: KanbanBoardData }) {
  const [tasks, setTasks] = useState(initialData.tasks);
  const [boardScope, setBoardScope] = useState<KanbanBoardScope>("team");
  const [memberFilter, setMemberFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "overdue" | "week" | "none">("all");
  const [topicFilter, setTopicFilter] = useState("");
  const [filterNow] = useState(() => Date.now());
  const [liveSyncStatus, setLiveSyncStatus] = useState<LiveSyncStatus>(
    initialData.dataSource === "supabase" ? "connecting" : "offline",
  );
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [showAutoTasking, setShowAutoTasking] = useState(false);
  const [showManualTask, setShowManualTask] = useState(false);
  const [showPmOnlyReworkModal, setShowPmOnlyReworkModal] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [refreshingProgress, setRefreshingProgress] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (initialData.dataSource !== "supabase") return;

    let disposed = false;
    const supabase = createClient();

    async function reconcileTaskStatuses() {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,status,updated_at")
        .eq("project_id", initialData.projectId);

      if (disposed) return;
      if (error) {
        setLiveSyncStatus("offline");
        return;
      }

      setTasks((current) =>
        applyKanbanTaskStatusSnapshot(
          current,
          (data ?? []).map((task) => ({
            id: task.id,
            status: task.status,
            updatedAt: task.updated_at,
          })),
        ),
      );
    }

    const channel = supabase
      .channel(`kanban-tasks:${initialData.projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${initialData.projectId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: unknown;
            status?: unknown;
            updated_at?: unknown;
          };
          const taskId = typeof row.id === "string" ? row.id : null;

          if (!taskId) return;

          setTasks((current) =>
            applyKanbanTaskStatusUpdate(current, {
              id: taskId,
              status: row.status,
              updatedAt:
                typeof row.updated_at === "string"
                  ? row.updated_at
                  : undefined,
            }),
          );
        },
      )
      .subscribe((status) => {
        if (disposed) return;

        if (status === "SUBSCRIBED") {
          setLiveSyncStatus("live");
          void reconcileTaskStatuses();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setLiveSyncStatus("offline");
        }
      });
    void reconcileTaskStatuses();
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${initialData.projectId}/tasks`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.tasks && !disposed) {
          setTasks((current) => applyKanbanTaskStatusSnapshot(current, data.tasks));
        }
      } catch {
        // non-blocking
      }
    }, 2000);

    return () => {
      disposed = true;
      clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
  }, [initialData.dataSource, initialData.projectId]);

  const visibleTasks = useMemo(() => {
    const scoped = filterKanbanTasksByScope(tasks, boardScope, initialData.currentUserId);
    const now = filterNow;
    const week = now + 7 * 24 * 60 * 60 * 1000;
    const topic = topicFilter.trim().toLocaleLowerCase();
    return scoped.filter((task) => {
      if (memberFilter !== "all" && task.assigneeId !== memberFilter) return false;
      if (deadlineFilter === "none" && task.dueAt) return false;
      if (deadlineFilter === "overdue" && (!task.dueAt || new Date(task.dueAt).getTime() >= now)) return false;
      if (deadlineFilter === "week" && (!task.dueAt || new Date(task.dueAt).getTime() > week || new Date(task.dueAt).getTime() < now)) return false;
      if (topic && ![task.title, task.description ?? "", ...task.requiredSkills].join(" ").toLocaleLowerCase().includes(topic)) return false;
      return true;
    });
  }, [boardScope, deadlineFilter, filterNow, initialData.currentUserId, memberFilter, tasks, topicFilter]);
  const tasksByStatus = useMemo(
    () =>
      Object.fromEntries(
        statuses.map((status) => [
          status,
          visibleTasks.filter((task) => task.status === status),
        ]),
      ) as Record<TaskStatus, KanbanTask[]>,
    [visibleTasks],
  );
  const completion = visibleTasks.length
    ? Math.round((tasksByStatus.done.length / visibleTasks.length) * 100)
    : 0;
  const overdueSummary = useMemo(() => {
    const overdue = visibleTasks
      .map((task) => ({ task, hours: getOverdueHours(task) }))
      .filter(
        (
          item,
        ): item is {
          task: KanbanTask;
          hours: number;
        } => item.hours !== null,
      );

    return {
      total: overdue.length,
      escalated: overdue.filter(
        (item) => item.hours >= initialData.deadlineEscalationHours,
      ).length,
    };
  }, [initialData.deadlineEscalationHours, visibleTasks]);

  const currentMember = initialData.members.find(
    (member) => member.id === initialData.currentUserId,
  );
  const isPersonalBoard = boardScope === "personal";

  function onDragStart(event: DragStartEvent) {
    setActiveTask(
      visibleTasks.find((task) => task.id === event.active.id) ?? null,
    );
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(event.active.id);
    const nextStatus = event.over?.data.current?.status as TaskStatus | undefined;
    const currentTask = tasks.find((task) => task.id === taskId);

    if (!currentTask || !nextStatus || currentTask.status === nextStatus) return;

    const transition = validateKanbanTransition({
      currentStatus: currentTask.status,
      nextStatus,
      role: initialData.currentUserRole,
    });

    if (!transition.allowed) {
      if (transition.code === "pm_required") {
        setShowPmOnlyReworkModal(true);
      }
      setToast({ tone: "error", message: transition.message });
      return;
    }

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
      const result = (await response.json()) as {
        error?: string;
        task?: {
          id: string;
          status: TaskStatus;
          updated_at: string;
        };
      };
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật task.");
      const persistedTask = result.task;
      if (persistedTask) {
        setTasks((current) =>
          applyKanbanTaskStatusUpdate(current, {
            id: persistedTask.id,
            status: persistedTask.status,
            updatedAt: persistedTask.updated_at,
          }),
        );
      }
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

  async function runDeadlineMonitor() {
    setMonitoring(true);
    setToast(null);

    try {
      const response = await fetch(
        `/api/projects/${initialData.projectId}/deadline-monitor`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        checkInsCreated?: number;
        escalationsCreated?: number;
        duplicateNotificationsSkipped?: number;
      };

      if (!response.ok) {
        throw new Error(result.error || "Không thể quét tiến độ.");
      }

      setToast({
        tone: "success",
        message: `Nexus đã tạo ${result.checkInsCreated ?? 0} hỏi thăm riêng và ${result.escalationsCreated ?? 0} cảnh báo leader${
          result.duplicateNotificationsSkipped
            ? `; bỏ qua ${result.duplicateNotificationsSkipped} thông báo đã gửi hôm nay`
            : ""
        }.`,
      });
    } catch (error) {
      setToast({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể chạy Deadline Monitor.",
      });
    } finally {
      setMonitoring(false);
    }
  }

  async function reportTaskAction(task: KanbanTask, action: "blocker_reported" | "support_requested") {
    if (initialData.dataSource === "mock") {
      setToast({ tone: "success", message: action === "support_requested" ? "Đã ghi nhận yêu cầu hỗ trợ trong demo." : "Đã ghi nhận blocker trong demo." });
      return;
    }
    try {
      const response = await fetch(`/api/projects/${initialData.projectId}/tasks/${task.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Không thể ghi nhận hoạt động task.");
      setToast({ tone: "success", message: action === "support_requested" ? "Đã gửi yêu cầu hỗ trợ cho PM." : "Đã ghi nhận blocker để PM theo dõi." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Không thể ghi nhận hoạt động task." });
    }
  }

  async function refreshProgress() {
    if (initialData.dataSource !== "supabase") {
      setToast({
        tone: "warning",
        message: "Demo data không có tiến độ mới để đồng bộ.",
      });
      return;
    }

    setRefreshingProgress(true);
    setToast(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("id,status,updated_at")
        .eq("project_id", initialData.projectId);

      if (error) throw new Error(error.message);

      setTasks((current) =>
        applyKanbanTaskStatusSnapshot(
          current,
          (data ?? []).map((task) => ({
            id: task.id,
            status: task.status,
            updatedAt: task.updated_at,
          })),
        ),
      );
      setToast({
        tone: "success",
        message: "Đã tải tiến độ mới nhất của project.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể làm mới tiến độ.",
      });
    } finally {
      setRefreshingProgress(false);
    }
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/70 ring-1 ring-white/15">
                <span
                  className={`size-1.5 rounded-full ${
                    initialData.dataSource === "mock"
                      ? "bg-slate-300"
                      : liveSyncStatus === "live"
                        ? "bg-emerald-300 shadow-[0_0_0_3px_rgba(110,231,183,0.15)]"
                        : liveSyncStatus === "connecting"
                          ? "animate-pulse bg-amber-300"
                          : "bg-rose-300"
                  }`}
                />
                {initialData.dataSource === "mock"
                  ? "Demo data"
                  : liveSyncStatus === "live"
                    ? "Live sync"
                    : liveSyncStatus === "connecting"
                      ? "Đang kết nối"
                      : "Mất đồng bộ"}
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

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <div className="flex min-w-56 items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                {isPersonalBoard ? (
                  <UserRound aria-hidden="true" size={17} />
                ) : (
                  <UsersRound aria-hidden="true" size={17} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <label
                  className="block text-[9px] font-black uppercase tracking-[0.16em] text-indigo-200"
                  htmlFor="kanban-board-scope"
                >
                  Board view
                </label>
                <div className="relative">
                  <select
                    className="w-full cursor-pointer appearance-none bg-transparent py-0.5 pr-6 text-sm font-black text-white outline-none"
                    id="kanban-board-scope"
                    onChange={(event) => {
                      setBoardScope(event.target.value as KanbanBoardScope);
                      setActiveTask(null);
                    }}
                    value={boardScope}
                  >
                    <option className="text-slate-900" value="personal">
                      Personal board
                    </option>
                    <option className="text-slate-900" value="team">
                      Team board
                    </option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-indigo-200"
                    size={15}
                  />
                </div>
              </div>
            </div>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-emerald-400 px-5 py-3.5 text-sm font-black text-emerald-950 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 sm:w-auto"
              disabled={!initialData.canAutoTask}
              onClick={() => setShowManualTask(true)}
              type="button"
            >
              <Plus aria-hidden="true" size={18} />
              Tạo task phát sinh
            </button>

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

      <section className="grid gap-4 rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-violet-50 p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <HeartHandshake aria-hidden="true" className="text-cyan-600" size={19} />
            Daily Deadline Copilot
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Mỗi ngày Nexus hỏi thăm riêng người có task quá hạn. Sau{" "}
            {initialData.deadlineEscalationHours} giờ, Bot Chat sẽ cảnh báo riêng
            leader để kiểm tra blocker và điều phối hỗ trợ.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              <Clock3 aria-hidden="true" size={13} />
              {overdueSummary.total} task đang trễ
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
              <ShieldAlert aria-hidden="true" size={13} />
              {overdueSummary.escalated} task cần báo leader
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {initialData.dataSource === "supabase" ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-wait disabled:opacity-60"
              disabled={refreshingProgress}
              onClick={refreshProgress}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={refreshingProgress ? "animate-spin" : ""}
                size={16}
              />
              {refreshingProgress ? "Đang làm mới…" : "Làm mới tiến độ"}
            </button>
          ) : null}

          {initialData.canAutoTask && initialData.dataSource === "supabase" ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              disabled={monitoring}
              onClick={runDeadlineMonitor}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={monitoring ? "animate-spin" : ""}
                size={16}
              />
              {monitoring ? "Đang quét…" : "Quét tiến độ hôm nay"}
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-500">
              Tự động đồng bộ mỗi 15 giây
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Bộ lọc board</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Thu hẹp task theo người, hạn và chủ đề</p>
          </div>
          <button className="text-xs font-bold text-cyan-700 transition hover:text-cyan-900" onClick={() => { setMemberFilter("all"); setDeadlineFilter("all"); setTopicFilter(""); }} type="button">Xóa bộ lọc</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <select aria-label="Lọc theo thành viên" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-400 focus:bg-white" onChange={(event) => setMemberFilter(event.target.value)} value={memberFilter}>
            <option value="all">Tất cả thành viên</option>
            {initialData.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <select aria-label="Lọc theo deadline" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-400 focus:bg-white" onChange={(event) => setDeadlineFilter(event.target.value as typeof deadlineFilter)} value={deadlineFilter}>
            <option value="all">Mọi deadline</option><option value="overdue">Đang quá hạn</option><option value="week">7 ngày tới</option><option value="none">Chưa có deadline</option>
          </select>
          <input aria-label="Lọc theo topic" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white" onChange={(event) => setTopicFilter(event.target.value)} placeholder="Topic, title, skill…" value={topicFilter} />
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

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
              isPersonalBoard
                ? "bg-violet-100 text-violet-700"
                : "bg-cyan-100 text-cyan-700"
            }`}
          >
            {isPersonalBoard ? (
              <UserRound aria-hidden="true" size={20} />
            ) : (
              <LayoutDashboard aria-hidden="true" size={20} />
            )}
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-950">
              {isPersonalBoard
                ? `Personal board${currentMember ? ` · ${currentMember.name}` : ""}`
                : "Team board"}
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {isPersonalBoard
                ? "Chỉ hiển thị các task được giao cho bạn."
                : "Hiển thị toàn bộ task và người phụ trách trong project."}
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          {visibleTasks.length}
          {isPersonalBoard ? `/${tasks.length}` : ""} task
        </span>
      </section>

      <DndContext
        id="kanban-dnd-context"
        collisionDetection={closestCorners}
        onDragCancel={() => setActiveTask(null)}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        sensors={sensors}
      >
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {statuses.map((status) => (
            <KanbanColumn
              canManageRework={initialData.currentUserRole === "pm"}
              onTaskAction={reportTaskAction}
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

      {showManualTask ? (
        <ManualTaskDialog
          members={initialData.members}
          tasks={tasks}
          onClose={() => setShowManualTask(false)}
          onCreated={(task) => setTasks((current) => [{ id: task.id, title: task.title, description: task.description ?? null, status: task.status, priority: task.priority, assigneeId: task.assignee_id, assigneeName: initialData.members.find((member) => member.id === task.assignee_id)?.name ?? task.assignee_id, assigneeAvatarUrl: null, requiredSkills: task.required_skills ?? [], dueAt: task.due_at ?? null, createdAt: task.created_at, updatedAt: task.updated_at }, ...current])}
          projectId={initialData.projectId}
        />
      ) : null}

      {showAutoTasking ? (
        <AutoTaskingDialog
          initialSummary={initialData.documentSummary}
          members={initialData.members}
          onClose={() => setShowAutoTasking(false)}
          onCreated={addGeneratedTasks}
          projectId={initialData.projectId}
        />
      ) : null}

      {showPmOnlyReworkModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-rose-100 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner">
              <ShieldAlert size={28} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Cảnh Báo Quyền Hạn
              </h3>
              <p className="mt-2 text-sm font-bold text-rose-600 bg-rose-50 p-3.5 rounded-2xl border border-rose-100 leading-relaxed">
                🚫 Chỉ PM mới có quyền chỉnh rework
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-5">
              Tính năng chuyển công việc sang cột Rework (Cần làm lại) dành riêng cho Quản trị viên (PM) để đánh giá chất lượng sản phẩm.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setShowPmOnlyReworkModal(false)}
                type="button"
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white transition hover:bg-slate-800 shadow-md"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
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
