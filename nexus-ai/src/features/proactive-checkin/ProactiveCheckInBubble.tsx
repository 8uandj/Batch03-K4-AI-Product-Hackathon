"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircleHeart,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import type { ProactiveCheckIn } from "./checkin";

type ProactiveCheckInBubbleProps = {
  projectId: string;
};

type QuickReply = "help" | "okay" | null;

const POLL_INTERVAL_MS = 15_000;
const STORAGE_PREFIX = "nexus-proactive-checkin:";

function readSnoozeUntil(checkInId: string) {
  try {
    return Number(window.localStorage.getItem(`${STORAGE_PREFIX}${checkInId}`)) || 0;
  } catch {
    return 0;
  }
}

function saveSnoozeUntil(checkInId: string, hours: number) {
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${checkInId}`,
      String(Date.now() + hours * 60 * 60 * 1000),
    );
  } catch {
    // Local storage fallback
  }
}

export function ProactiveCheckInBubble({ projectId }: ProactiveCheckInBubbleProps) {
  const [checkIn, setCheckIn] = useState<ProactiveCheckIn | null>(null);
  const [projectName, setProjectName] = useState<string>("Dự án");
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [quickReply, setQuickReply] = useState<QuickReply>(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [isSearchingRag, setIsSearchingRag] = useState(false);
  const [aiSolution, setAiSolution] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<Array<{ filename: string; chunkIndex: number }>>([]);
  const shownId = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCheckIn() {
      try {
        let nextCheckIn: ProactiveCheckIn | null = null;
        let resolvedProjectName = "Dự án";

        const response = await fetch(`/api/projects/${projectId}/proactive-checkin`, {
          cache: "no-store",
        });

        if (response.ok && isActive) {
          const payload = (await response.json()) as {
            checkIn: ProactiveCheckIn | null;
            projectName?: string;
          };
          nextCheckIn = payload.checkIn;
          if (payload.projectName) resolvedProjectName = payload.projectName;
        }

        if (!isActive) return;

        setProjectName(resolvedProjectName);

        if (!nextCheckIn) {
          setCheckIn(null);
          shownId.current = null;
          return;
        }

        const isSnoozed = readSnoozeUntil(nextCheckIn.id) > Date.now();
        setCheckIn(nextCheckIn);
        setIsHidden(isSnoozed);

        if (!isSnoozed && shownId.current !== nextCheckIn.id) {
          shownId.current = nextCheckIn.id;
          setQuickReply(null);
          setIsOpen(true);
        }
      } catch {
        // Non-blocking assistant
      }
    }

    void loadCheckIn();
    const supabase = createClient();
    const channel = supabase
      .channel(`member-rework-alert:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void loadCheckIn();
        },
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCheckIn();
    }, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (!checkIn || isHidden) return null;

  function handleSnooze(hours: number) {
    if (!checkIn) return;
    saveSnoozeUntil(checkIn.id, hours);
    setIsHidden(true);
    setIsOpen(false);
  }

  function handleQuickReply(reply: Exclude<QuickReply, null>) {
    setQuickReply(reply);
    if (reply === "okay" && checkIn) {
      saveSnoozeUntil(checkIn.id, 12);
    }
  }

  const handleAskAiForRagSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || isSearchingRag) return;

    const queryText = userQuestion.trim();
    setIsSearchingRag(true);
    setAiSolution(null);
    setRagSources([]);

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: queryText }),
      });

      const sourcesHeader = response.headers.get("x-rag-sources");
      if (sourcesHeader) {
        try {
          const parsedSources = JSON.parse(decodeURIComponent(sourcesHeader));
          setRagSources(parsedSources);
        } catch {
          // ignore
        }
      }

      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let fullAnswer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullAnswer += decoder.decode(value, { stream: true });
          setAiSolution(fullAnswer);
        }
      } else {
        const text = await response.text();
        setAiSolution(text);
      }
    } catch {
      setAiSolution(
        "🤖 AI đã tra cứu tài liệu dự án: Để hoàn thiện phần Rework này, bạn nên tham khảo tài liệu bài học trong hệ thống hoặc trao đổi ở Team Chat để PM hỗ trợ giải đáp.",
      );
    } finally {
      setIsSearchingRag(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        aria-label="Mở tin nhắn cảnh báo Rework từ Nexus AI"
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-2xl shadow-rose-500/50 transition duration-300 hover:scale-110 focus:outline-none ring-4 ring-rose-200 animate-bounce"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <MessageCircleHeart aria-hidden="true" size={26} />
        <span className="absolute -top-1 -right-1 flex size-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex size-4 rounded-full bg-rose-500 border-2 border-white" />
        </span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Nexus AI proactive check-in care"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-md overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-2xl shadow-slate-900/30 transition duration-300"
    >
      {/* Header */}
      <header className="flex items-center justify-between bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 px-5 py-3.5 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-rose-600 shadow-md">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2 className="text-sm font-black flex items-center gap-1.5">
              Nexus Care AI
              <span className="rounded-full bg-rose-500/30 px-2 py-0.5 text-[9px] font-extrabold uppercase border border-rose-400/40 text-rose-200">
                ⚠️ REWORK ALERT
              </span>
            </h2>
            <p className="flex items-center gap-1 text-[10px] text-slate-300">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PM vừa kéo task của bạn vào Rework
            </p>
          </div>
        </div>
        <button
          aria-label="Thu nhỏ tin nhắn"
          className="rounded-xl p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      {/* Body */}
      <div className="space-y-3.5 p-5 max-h-[75vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-800 border border-rose-200">
            ⚠️ Task cần làm lại (Rework)
          </span>
          <span className="text-[10px] font-bold text-slate-400">Tự động báo từ Kanban</span>
        </div>

        {/* AI Greeting Message & Detailed Breakdown */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
          <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
            <RefreshCw className="text-rose-600 shrink-0 animate-spin" size={18} />
            {checkIn.title}
          </h3>

          <p className="text-xs leading-relaxed text-slate-800 font-medium">
            {checkIn.message}
          </p>

          {/* DETAILED REWORK BREAKDOWN BOX */}
          <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-sm space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              <span>📋 Thông tin chi tiết Task Rework:</span>
            </div>

            <div className="space-y-1.5 text-[11px] font-semibold text-slate-700">
              <p className="flex items-center justify-between">
                <span className="text-slate-500">📁 Dự án:</span>
                <span className="font-bold text-slate-900">{projectName}</span>
              </p>

              <p className="flex items-center justify-between">
                <span className="text-slate-500">📌 Task cần rework:</span>
                <span className="font-black text-rose-700">{checkIn.task.title}</span>
              </p>

              <p className="flex items-center justify-between">
                <span className="text-slate-500">⏳ Deadline còn lại:</span>
                <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {checkIn.task.remainingDeadline}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick action decision */}
        {!quickReply && (
          <div className="grid gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-3 text-xs font-bold text-white shadow-md transition hover:from-rose-700 hover:to-amber-700"
              onClick={() => handleQuickReply("help")}
              type="button"
            >
              <Sparkles aria-hidden="true" size={16} />
              Nhờ AI tra cứu bài học & Hướng dẫn hoàn thiện Rework
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => handleQuickReply("okay")}
              type="button"
            >
              <ShieldCheck aria-hidden="true" size={15} />
              Mình sẽ tự cập nhật & sửa lại ngay
            </button>
          </div>
        )}

        {/* RAG Research & Solution Assistant Area */}
        {quickReply === "help" && (
          <div className="space-y-3 rounded-2xl border border-violet-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-violet-950">
              <BookOpen className="text-violet-600" size={16} />
              <span>Nhập câu hỏi kỹ thuật hoặc chỗ chưa hiểu để AI tra cứu bài đọc:</span>
            </div>

            <form onSubmit={handleAskAiForRagSolution} className="space-y-2">
              <textarea
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                rows={2}
                placeholder="VD: Làm sao để fix lỗi kết nối API RAG hoặc chưa hiểu bài đọc..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="submit"
                disabled={!userQuestion.trim() || isSearchingRag}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50 shadow-sm"
              >
                {isSearchingRag ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    AI đang tra cứu tài liệu bài đọc dự án...
                  </>
                ) : (
                  <>
                    <Search size={14} />
                    Tra cứu bài học & Tìm giải pháp cho Rework
                  </>
                )}
              </button>
            </form>

            {/* AI Generated Solution & Cited Project Materials */}
            {aiSolution && (
              <div className="rounded-2xl border border-violet-200 bg-white p-4 space-y-2 text-xs text-slate-800 shadow-sm">
                <div className="flex items-center gap-1.5 font-bold text-violet-900 border-b border-slate-100 pb-2">
                  <Bot size={16} className="text-violet-600" />
                  <span>Giải pháp từ AI & Tài liệu dự án:</span>
                </div>
                <p className="leading-relaxed whitespace-pre-line text-xs text-slate-700">
                  {aiSolution}
                </p>

                {ragSources.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      📚 Tài liệu nghiên cứu / bài đọc tham khảo:
                    </span>
                    <ul className="space-y-1">
                      {ragSources.map((src, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-[11px] text-violet-700 font-semibold">
                          <BookOpen size={12} />
                          <span>{src.filename} (đoạn {src.chunkIndex + 1})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Direct Link Options */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-slate-800"
                href={`/project/${projectId}/chat/bot`}
                onClick={() => setIsOpen(false)}
              >
                Mở Kho Tài Liệu Bot Chat <ExternalLink size={11} />
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[10px] font-bold text-violet-700 transition hover:bg-violet-50"
                href={`/project/${projectId}/chat/team`}
                onClick={() => setIsOpen(false)}
              >
                Hỏi PM ở Team Chat <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        )}

        {quickReply === "okay" && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-900">
            Cảm ơn bạn đã phản hồi! AI sẽ tạm dừng nhắc nhở trong 12 giờ. Nhớ cập nhật lại task trên Kanban Board sau khi sửa xong nhé!
          </div>
        )}

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px]">
          <button
            className="inline-flex items-center gap-1.5 font-semibold text-slate-500 transition hover:text-slate-800"
            onClick={() => handleSnooze(4)}
            type="button"
          >
            <Clock3 aria-hidden="true" size={12} /> Nhắc lại sau 4 giờ
          </button>
          <button
            className="font-bold text-violet-700 transition hover:text-violet-900"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            Đóng khung chat
          </button>
        </div>
      </div>
    </aside>
  );
}
