"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Sparkles,
  Trash2,
  Plus,
  Send,
  Check,
  BrainCircuit,
  X,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  AlertTriangle
} from "lucide-react";

import type { WorkspaceMemberProfile } from "../types";
import type { TaskPriority } from "@/types";

type TaskDraft = {
  id?: string; // Client-side unique key
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id: string;
  required_skills: string[];
  due_in_days: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ProjectAiPlannerProps = {
  projectId: string;
  initialDeadline: string | null;
  members: WorkspaceMemberProfile[];
  documentsIndexed: number;
  currentRole: "pm" | "member";
};

export function ProjectAiPlanner({
  projectId,
  initialDeadline,
  members,
  documentsIndexed,
  currentRole
}: ProjectAiPlannerProps) {
  // Project deadline states
  const [deadline, setDeadline] = useState<string>(
    initialDeadline ? new Date(initialDeadline).toISOString().split("T")[0] : ""
  );
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [deadlineMsg, setDeadlineMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Planner states
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeStage, setActiveStage] = useState<"idle" | "planning">("idle");
  const [error, setError] = useState<string | null>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Inline edit state
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);

  // Success dispatch state
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [dispatchedCount, setDispatchedCount] = useState(0);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Handle saving project deadline
  async function handleSaveDeadline() {
    setIsSavingDeadline(true);
    setDeadlineMsg(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlineAt: deadline ? new Date(deadline).toISOString() : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu deadline.");

      setDeadlineMsg({ tone: "success", text: "Đã cập nhật deadline dự án thành công." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lưu deadline.";
      setDeadlineMsg({ tone: "error", text: message });
    } finally {
      setIsSavingDeadline(false);
    }
  }

  // Handle AI Planner Initialization
  async function handleInitializePlanner() {
    setIsInitializing(true);
    setError(null);
    setDispatchSuccess(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/planner/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lỗi khởi chạy AI Planner.");

      // Map unique keys for react rendering
      const tasksWithKeys = (data.tasks || []).map((t: TaskDraft, idx: number) => ({
        ...t,
        id: `task-${Date.now()}-${idx}-${Math.random()}`
      }));

      setRecommendationId(data.recommendationId);
      setTasks(tasksWithKeys);
      setChatMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Chào PM, tôi đã phân tích tài liệu và thành viên dự án. Dựa vào thời hạn hoàn thành dự án là ${data.deadlineDays} ngày, tôi đề xuất chia thành ${tasksWithKeys.length} task cho các thành viên. Bạn có thể kéo xuống dưới để sửa trực tiếp hoặc trao đổi ở khung chat bên phải này để tôi tự động cập nhật lại!`
        }
      ]);
      setActiveStage("planning");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi kết nối AI Planner.";
      setError(message);
    } finally {
      setIsInitializing(false);
    }
  }

  // Handle sending a chat message to AI Planner
  async function handleSendChatMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const message = chatInput.trim();
    if (!message || isChatLoading) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: message,
    };

    setChatMessages((prev) => [...prev, newUserMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Map current tasks back to the clean structure (without our temporary UI client-side ids)
      const cleanTasks = tasks.map(({ title, description, priority, assignee_id, required_skills, due_in_days }) => ({
        title,
        description,
        priority,
        assignee_id,
        required_skills,
        due_in_days
      }));

      const response = await fetch(`/api/projects/${projectId}/planner/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          message,
          tasks: cleanTasks,
          history: chatMessages.map(({ role, content }) => ({ role, content }))
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Trợ lý gặp sự cố khi xử lý.");

      // Add temporary keys for updated tasks
      const tasksWithKeys = (data.tasks || []).map((t: TaskDraft, idx: number) => ({
        ...t,
        id: `task-${Date.now()}-${idx}-${Math.random()}`
      }));

      setTasks(tasksWithKeys);
      setChatMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: data.message
        }
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể kết nối trợ lý AI.";
      setChatMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: `Có lỗi xảy ra: ${message}`
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  // Handle Dispatch/Approval to Kanban Board
  async function handleApprovePlanner() {
    setError(null);
    setIsInitializing(true);
    try {
      const cleanTasks = tasks.map(({ title, description, priority, assignee_id, required_skills, due_in_days }) => ({
        title,
        description,
        priority,
        assignee_id,
        required_skills,
        due_in_days
      }));

      const response = await fetch(`/api/projects/${projectId}/planner/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          tasks: cleanTasks,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể phê duyệt kế hoạch.");

      setDispatchedCount(data.count || cleanTasks.length);
      setDispatchSuccess(true);
      setActiveStage("idle");
      setTasks([]);
      setChatMessages([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lưu task vào Kanban board.";
      setError(message);
    } finally {
      setIsInitializing(false);
    }
  }

  // Edit task handlers (PM full control)
  function handleUpdateTaskField(index: number, field: keyof TaskDraft, value: string | number | string[]) {
    setTasks((prev) =>
      prev.map((task, idx) => (idx === index ? { ...task, [field]: value } : task))
    );
  }

  function handleDeleteTask(index: number) {
    setTasks((prev) => prev.filter((_, idx) => idx !== index));
    if (editingTaskIndex === index) setEditingTaskIndex(null);
  }

  function handleAddTaskManually() {
    const newTask: TaskDraft = {
      id: `task-${Date.now()}-new-${Math.random()}`,
      title: "Task mới tạo thủ công",
      description: "Mô tả công việc cần làm...",
      priority: "medium",
      assignee_id: members[0]?.id || "",
      required_skills: ["General"],
      due_in_days: 7
    };
    setTasks((prev) => [...prev, newTask]);
    setEditingTaskIndex(tasks.length); // Open editing mode for new task
  }

  if (currentRole !== "pm") {
    return (
      <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto text-amber-500" size={32} />
        <h3 className="mt-3 text-lg font-black text-slate-900">Tính năng giới hạn</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Nexus AI Planner chỉ dành cho Project Manager (PM) để lập kế hoạch dự án. 
          Các thành viên chỉ tham gia thực hiện các task được PM giao trên Kanban Board.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* 1. Project Deadline Setup */}
      <article className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Calendar className="text-cyan-600" size={20} />
              Thời hạn dự án (Project Deadline)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Thiết lập ngày dự kiến hoàn thành toàn bộ dự án. AI Planner sẽ dựa vào đây để phân chia deadline cho từng task.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400 focus:bg-white"
              onChange={(e) => setDeadline(e.target.value)}
              type="date"
              value={deadline}
            />
            <button
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={isSavingDeadline}
              onClick={handleSaveDeadline}
            >
              {isSavingDeadline ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
        {deadlineMsg && (
          <p className={`mt-3 text-xs font-semibold ${deadlineMsg.tone === "error" ? "text-rose-600" : "text-emerald-600"}`}>
            {deadlineMsg.text}
          </p>
        )}
      </article>

      {/* 2. Success/Error Messages */}
      {dispatchSuccess && (
        <article className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-sm animate-pulse">
          <CheckCircle2 className="shrink-0" size={20} />
          <div>
            <p className="text-sm font-black">Phê duyệt kế hoạch thành công!</p>
            <p className="text-xs text-emerald-600">Đã đồng bộ {dispatchedCount} task mới vào Kanban Board của dự án.</p>
          </div>
        </article>
      )}

      {error && (
        <article className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow-sm">
          <AlertCircle className="shrink-0" size={20} />
          <p className="text-sm font-semibold">{error}</p>
        </article>
      )}

      {/* 3. Planner Main Workflow */}
      {activeStage === "idle" ? (
        <article className="rounded-3xl border border-violet-100 bg-violet-50/50 p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
            <BrainCircuit size={26} />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-950">Nexus AI Project Planner</h2>
          <p className="mt-2 max-w-xl mx-auto text-sm leading-6 text-slate-600">
            Nexus AI Planner sẽ đọc tài liệu dự án để phân tích kiến trúc, mục tiêu, kết hợp cùng hồ sơ năng lực thành viên để lập dự thảo chia việc và deadline hợp lý.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-500">
            <span className={`flex items-center gap-1.5 ${documentsIndexed > 0 ? "text-emerald-600" : "text-amber-500"}`}>
              {documentsIndexed > 0 ? "✓" : "!"} {documentsIndexed} tài liệu đã index
            </span>
            <span className={`flex items-center gap-1.5 ${members.length > 0 ? "text-emerald-600" : "text-amber-500"}`}>
              {members.length > 0 ? "✓" : "!"} {members.length} thành viên dự án
            </span>
            <span className={`flex items-center gap-1.5 ${deadline ? "text-emerald-600" : "text-amber-500"}`}>
              {deadline ? "✓" : "!"} {deadline ? `Deadline: ${deadline}` : "Chưa cấu hình deadline"}
            </span>
          </div>

          <button
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isInitializing}
            onClick={handleInitializePlanner}
          >
            {isInitializing ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Sparkles size={16} />
            )}
            {isInitializing ? "Đang chuẩn bị kế hoạch..." : "Khởi chạy AI Planner"}
          </button>
        </article>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          
          {/* A. Draft Tasks List (Left Panel) */}
          <div className="space-y-4">
            <header className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ListTodo className="text-slate-600" size={18} />
                  Bản nháp chia việc ({tasks.length} tasks)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Click vào thẻ để tự chỉnh sửa thủ công theo ý bạn.</p>
              </div>
              <button
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                onClick={handleAddTaskManually}
              >
                <Plus size={14} /> Thêm task thủ công
              </button>
            </header>

            <div className="space-y-3">
              {tasks.map((task, index) => {
                const isEditing = editingTaskIndex === index;
                const assigneeName = members.find((m) => m.id === task.assignee_id)?.name || "Chưa gán";

                return (
                  <article
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                      isEditing ? "border-violet-500 ring-2 ring-violet-100" : "hover:border-slate-300"
                    }`}
                    key={task.id || index}
                  >
                    {isEditing ? (
                      // EDITING MODE FORM
                      <div className="space-y-4">
                        <header className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-violet-600">Sửa Task dự thảo #{index + 1}</span>
                          <button
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            onClick={() => setEditingTaskIndex(null)}
                          >
                            <X size={16} />
                          </button>
                        </header>

                        <div>
                          <label className="text-xs font-bold text-slate-700">Tên công việc</label>
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50"
                            onChange={(e) => handleUpdateTaskField(index, "title", e.target.value)}
                            value={task.title}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700">Mô tả công việc</label>
                          <textarea
                            className="mt-1 w-full min-h-16 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50"
                            onChange={(e) => handleUpdateTaskField(index, "description", e.target.value)}
                            value={task.description}
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700">Người thực hiện</label>
                            <select
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-medium outline-none focus:border-violet-400"
                              onChange={(e) => handleUpdateTaskField(index, "assignee_id", e.target.value)}
                              value={task.assignee_id}
                            >
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.role})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700">Độ ưu tiên</label>
                            <select
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-medium outline-none focus:border-violet-400"
                              onChange={(e) => handleUpdateTaskField(index, "priority", e.target.value)}
                              value={task.priority}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700">Thời hạn (số ngày nữa)</label>
                            <input
                              className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-violet-400"
                              min={1}
                              onChange={(e) => handleUpdateTaskField(index, "due_in_days", Number(e.target.value))}
                              type="number"
                              value={task.due_in_days}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                          <button
                            className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800"
                            onClick={() => handleDeleteTask(index)}
                            type="button"
                          >
                            <Trash2 size={13} /> Xóa task
                          </button>
                          <button
                            className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
                            onClick={() => setEditingTaskIndex(null)}
                            type="button"
                          >
                            <Check size={13} /> Xong
                          </button>
                        </div>
                      </div>
                    ) : (
                      // VIEWING MODE CARD
                      <div className="cursor-pointer" onClick={() => setEditingTaskIndex(index)}>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold text-slate-900 text-sm hover:text-violet-700 transition">
                            {task.title || "Chưa đặt tên task"}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                              task.priority === "high"
                                ? "bg-rose-50 text-rose-700"
                                : task.priority === "medium"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {task.description || "Chưa có mô tả công việc."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            Giao cho: <strong className="text-slate-800">{assigneeName}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            Thời hạn: <strong className="text-slate-800">{task.due_in_days} ngày nữa</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Submit Action Footer */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                onClick={() => {
                  setActiveStage("idle");
                  setTasks([]);
                  setChatMessages([]);
                }}
              >
                Hủy bản nháp
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-lg"
                onClick={handleApprovePlanner}
              >
                Phê duyệt & Đồng bộ sang Kanban
              </button>
            </div>
          </div>

          {/* B. AI Planner Negotiation Chat (Right Panel) */}
          <div className="flex flex-col h-[calc(100vh-16rem)] min-h-[480px] rounded-3xl border bg-white shadow-sm overflow-hidden">
            <header className="border-b px-4 py-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow">
                  <BrainCircuit size={14} />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Thương lượng với AI</h3>
                  <p className="text-[10px] text-slate-400">Điều chỉnh nhân sự / thời hạn</p>
                </div>
              </div>
            </header>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {chatMessages.map((message) => {
                const isAI = message.role === "assistant";
                return (
                  <div className={`flex gap-2 ${isAI ? "justify-start" : "justify-end"}`} key={message.id}>
                    {isAI && (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-violet-600">
                        <BrainCircuit size={12} />
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                        isAI
                          ? "border border-slate-100 bg-white text-slate-800"
                          : "bg-slate-950 text-white"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}
              {isChatLoading && (
                <div className="flex gap-2 justify-start">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-violet-600">
                    <BrainCircuit size={12} />
                  </span>
                  <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 animate-pulse rounded-full bg-slate-400" />
                      <span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
                      <span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <form className="border-t p-3 bg-white flex gap-2" onSubmit={handleSendChatMessage}>
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white"
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ví dụ: 'Dời task code thêm 3 ngày'..."
                value={chatInput}
              />
              <button
                className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:opacity-40"
                disabled={!chatInput.trim() || isChatLoading}
                type="submit"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
          
        </div>
      )}
    </section>
  );
}
