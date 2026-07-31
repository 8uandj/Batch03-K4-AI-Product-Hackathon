"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, FolderKanban, Loader2, MessageSquare, Send, ShieldCheck, UserCheck, UserRound } from "lucide-react";

import type { TeamChatMessageItem } from "@/app/api/projects/[id]/team-chat/route";

export type ProjectOption = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  role?: "pm" | "member";
};

export type TeamChatProps = {
  projectId: string;
  userProjects?: ProjectOption[];
};

export function TeamChat({ projectId, userProjects = [] }: TeamChatProps) {
  const router = useRouter();
  const [activeProjectId, setActiveProjectId] = useState(projectId);
  const [messages, setMessages] = useState<TeamChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkerRunning, setIsWorkerRunning] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Default project options if none passed or demo mode
  const projectsList: ProjectOption[] =
    userProjects.length > 0
      ? userProjects
      : [
          { id: projectId === "demo" ? "demo" : projectId, name: "Dự án Nexus AI (Hiệu năng & RAG)" },
          { id: "demo-ecommerce", name: "Dự án E-Commerce (Payment & Order Flow)" },
          { id: "demo-mobile", name: "Dự án Mobile App (iOS / Android Release)" },
        ];

  const currentProject = projectsList.find((p) => p.id === activeProjectId) || projectsList[0];

  // Fetch live chat messages
  const fetchMessages = async (targetId: string) => {
    try {
      const res = await fetch(`/api/projects/${targetId}/team-chat`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
      if (data.currentUserId) {
        setCurrentUserId(data.currentUserId);
      }
    } catch (err) {
      console.error("Lỗi tải tin nhắn Team Chat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchMessages(activeProjectId);

    // Fast 2-second real-time polling to instantly sync messages between project members
    const interval = setInterval(() => fetchMessages(activeProjectId), 2000);
    return () => clearInterval(interval);
  }, [activeProjectId]);

  const handleSwitchProject = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setActiveProjectId(nextId);
    if (!nextId.startsWith("demo-")) {
      router.push(`/project/${nextId}/chat/team`);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/projects/${activeProjectId}/team-chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: userText }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setTimeout(() => fetchMessages(activeProjectId), 500);
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleRunProgressWorker = async () => {
    setIsWorkerRunning(true);
    try {
      await fetch(`/api/projects/${activeProjectId}/track-task-delays`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ simulatedDelayHours: 4 }),
      });

      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const memberRemindMsg: TeamChatMessageItem = {
        id: `msg_remind_${Date.now()}`,
        senderId: null,
        senderName: "Nexus AI Remind Bot",
        senderRole: "ai",
        senderType: "assistant",
        content:
          "💬 [AI Remind - Cập nhật 2h/lần]: Chào Nguyễn Văn Tuấn (Frontend Lead), task 'Xây dựng giao diện Kanban Board' của bạn đang trễ 4 tiếng so với mốc 3h quy định. Bạn có cần hỗ trợ gỡ blocker kỹ thuật hay nhờ đồng đội hỗ trợ không?",
        createdAt: nowTime,
      };

      const leaderAlertMsg: TeamChatMessageItem = {
        id: `msg_alert_${Date.now()}`,
        senderId: null,
        senderName: "Nexus AI Leader Alert",
        senderRole: "ai",
        senderType: "assistant",
        content:
          "🚨 [AI CẢNH BÁO LEADER]: Thành viên Trần Minh Hoàng (Backend Lead) đã trễ task 'Cấu hình RAG Vector Search' 3 ngày (> 2 ngày). AI đề xuất 3 giải pháp cho Leader:\n1. Tách sub-task giao bớt cho thành viên khác;\n2. Họp khẩn 1-1 gỡ blocker;\n3. Dời deadline sang Sprint tiếp theo.",
        createdAt: nowTime,
      };

      setMessages((prev) => [...prev, memberRemindMsg, leaderAlertMsg]);
    } catch (err) {
      console.error("Lỗi chạy worker:", err);
    } finally {
      setIsWorkerRunning(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* 1. PROJECT CHAT ROOM SELECTOR BAR (BLOCK DOWN DROPDOWN) */}
      <div className="border-b bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-3.5 text-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md">
            <FolderKanban size={18} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
              Phòng Chat Nhóm Đang Chọn
            </span>
            <h2 className="text-sm font-bold text-white leading-tight">
              {currentProject.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-300 shrink-0">
            Đổi phòng chat dự án:
          </label>
          <select
            value={activeProjectId}
            onChange={handleSwitchProject}
            className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white outline-none transition hover:bg-white/20 focus:bg-slate-900 focus:ring-2 focus:ring-violet-400 cursor-pointer"
          >
            {projectsList.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white font-medium">
                💬 {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. CHAT HEADER */}
      <header className="border-b bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare aria-hidden="true" className="text-violet-600" size={20} />
            <h1 className="font-black text-slate-950 text-base">
              Kênh Chat Nội Bộ Live - {currentProject.name}
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Không gian trao đổi trực tuyến giữa các thành viên. Hiển thị vai trò (PM / Member) và tự động đồng bộ thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunProgressWorker}
            disabled={isWorkerRunning}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:from-violet-700 hover:to-rose-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Bot size={14} className={isWorkerRunning ? "animate-spin" : ""} />
            {isWorkerRunning ? "AI đang quét..." : "⚡ Worker Giám sát (Nhắc 2h & Báo Leader)"}
          </button>

          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shrink-0">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live Supabase Sync (2s)
          </div>
        </div>
      </header>

      {/* 3. MESSAGE LIST */}
      <div className="flex-1 space-y-4 bg-slate-50/60 p-6 overflow-y-auto max-h-[55vh]">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 font-medium text-xs flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-violet-600" size={24} />
            Đang tải phòng chat của {currentProject.name}...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium text-xs">
            Phòng chat nhóm dự án này chưa có tin nhắn. Hãy gửi lời chào đầu tiên!
          </div>
        ) : (
          messages.map((message) => {
            const isMe = currentUserId && message.senderId === currentUserId;

            return (
              <article
                className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                key={message.id}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${
                    message.senderType === "assistant"
                      ? "bg-violet-600 text-white border-violet-700"
                      : isMe
                        ? "bg-indigo-600 text-white border-indigo-700"
                        : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {message.senderType === "assistant" ? (
                    <Bot aria-hidden="true" size={16} />
                  ) : (
                    <UserRound aria-hidden="true" size={16} />
                  )}
                </span>

                <div
                  className={`max-w-xl rounded-2xl border px-4 py-3 shadow-sm ${
                    message.senderType === "assistant"
                      ? "bg-violet-50/90 border-violet-200 text-violet-950 font-medium"
                      : isMe
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  {/* Sender Header info with Role Badge */}
                  <div
                    className={`flex items-center gap-2 text-xs mb-1 ${
                      isMe ? "text-indigo-100 justify-end" : "text-slate-500"
                    }`}
                  >
                    {/* Role Badge (PM / Member / AI) */}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        message.senderRole === "pm"
                          ? isMe
                            ? "bg-rose-500/30 text-rose-200 border border-rose-300/40"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                          : message.senderRole === "ai"
                            ? "bg-violet-200 text-violet-900 border border-violet-300"
                            : isMe
                              ? "bg-cyan-500/30 text-cyan-200 border border-cyan-300/40"
                              : "bg-cyan-100 text-cyan-800 border border-cyan-200"
                      }`}
                    >
                      {message.senderRole === "pm"
                        ? "👑 PM"
                        : message.senderRole === "ai"
                          ? "🤖 AI Bot"
                          : "👤 Member"}
                    </span>

                    <span className="font-bold">{message.senderName}</span>
                    <span className="text-[10px] opacity-75">{message.createdAt}</span>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed whitespace-pre-line">{message.content}</p>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 4. INPUT BAR */}
      <div className="border-t bg-white p-4 space-y-2">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Nhập tin nhắn gửi tới các thành viên phòng ${currentProject.name}...`}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <span>{isSending ? "Đang gửi..." : "Gửi"}</span>
            <Send size={14} />
          </button>
        </form>
        <p className="text-[11px] text-slate-400 text-center font-medium">
          💡 Đang trò chuyện trực tuyến trong phòng: <strong>{currentProject.name}</strong>. Tin nhắn tự động đồng bộ mỗi 2 giây.
        </p>
      </div>
    </section>
  );
}
