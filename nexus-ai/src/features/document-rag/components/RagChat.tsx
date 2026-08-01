"use client";

import { AlertTriangle, Bot, FileText, HeartHandshake, MoreVertical, Send, SlidersHorizontal, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import type { DeadlineBotNotification } from "@/features/deadline-monitor/data";
import type { ChatMessage, RagSourceReference } from "../types";
import { FormattedMessage } from "./FormattedMessage";

type RagChatProps = {
  initialDeadlineNotifications?: DeadlineBotNotification[];
  projectId: string;
  projectName: string;
};

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Chào bạn, mình là Nexus Knowledge Bot. Hãy hỏi mình về tài liệu của dự án; câu trả lời sẽ kèm nguồn để bạn kiểm tra.",
};

export function RagChat({ initialDeadlineNotifications = [], projectId, projectName }: RagChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question };
    const answerId = crypto.randomUUID();
    const previous = messages.filter((message) => message.id !== "welcome");
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, history: previous.map(({ role, content }) => ({ role, content })) }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Bot chưa thể trả lời.");
      }
      const sources = parseSources(response.headers.get("x-rag-sources"));
      setMessages((current) => [...current, { id: answerId, role: "assistant", content: "", sources }]);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Trình duyệt không hỗ trợ streaming.");
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((current) => current.map((message) => message.id === answerId ? { ...message, content: message.content + text } : message));
      }
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Bot chưa thể trả lời.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-7rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#343942] bg-[#202329] shadow-xl shadow-black/10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#343942] px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Cuộc trò chuyện</h1>
          <p className="mt-1 text-xs text-slate-500">Nexus Knowledge Bot · {projectName}</p>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <button aria-label="Tùy chỉnh cuộc trò chuyện" className="rounded-lg p-2 transition hover:bg-[#30353e] hover:text-white" type="button"><SlidersHorizontal size={18} /></button>
          <button aria-label="Tùy chọn khác" className="rounded-lg p-2 transition hover:bg-[#30353e] hover:text-white" type="button"><MoreVertical size={18} /></button>
        </div>
      </header>

      <div aria-live="polite" className="flex-1 space-y-5 overflow-y-auto bg-[#17191f] px-3 py-5 sm:px-8 sm:py-7">
        {initialDeadlineNotifications.map((notification) => {
          const isEscalation = notification.kind === "leader_escalation";
          const Icon = isEscalation ? AlertTriangle : HeartHandshake;
          return (
            <article className="flex gap-3" key={notification.id}>
              <MessageAvatar role="assistant" />
              <div className={`max-w-[min(760px,90%)] rounded-2xl border px-4 py-3 shadow-sm ${isEscalation ? "border-rose-400/30 bg-rose-400/10" : "border-cyan-400/30 bg-cyan-400/10"}`}>
                <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${isEscalation ? "text-rose-300" : "text-cyan-300"}`}>
                  <Icon aria-hidden="true" size={15} /><span>{isEscalation ? "Cảnh báo riêng cho leader" : "Nexus hỏi thăm riêng"}</span><span className="font-normal opacity-70">· {formatNotificationTime(notification.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-200">{notification.content}</p>
                <Link className={`mt-3 inline-flex text-xs font-bold underline-offset-4 hover:underline ${isEscalation ? "text-rose-300" : "text-cyan-300"}`} href={notification.actionLink || `/project/${projectId}/board`}>Mở task trên Kanban →</Link>
              </div>
            </article>
          );
        })}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`} key={message.id}>
              {!isUser ? <MessageAvatar role="assistant" /> : null}
              <div className={`max-w-[min(720px,88%)] ${isUser ? "order-first" : ""}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${isUser ? "bg-[#6872f7] text-white" : "border border-[#343942] bg-[#202329] text-slate-200"}`}>
                  {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : message.content ? <FormattedMessage content={message.content} /> : <span className="text-slate-500">Đang tổng hợp câu trả lời…</span>}
                </div>
                {message.sources?.length ? <SourceReferences sources={message.sources} /> : null}
              </div>
              {isUser ? <MessageAvatar role="user" /> : null}
            </article>
          );
        })}

        {loading ? <article className="flex gap-3"><MessageAvatar role="assistant" /><div className="rounded-2xl border border-[#343942] bg-[#202329] px-4 py-3"><span className="flex items-center gap-1" aria-label="Bot đang trả lời"><span className="size-2 animate-pulse rounded-full bg-slate-500" /><span className="size-2 animate-pulse rounded-full bg-slate-500 [animation-delay:120ms]" /><span className="size-2 animate-pulse rounded-full bg-slate-500 [animation-delay:240ms]" /></span></div></article> : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#343942] bg-[#202329] p-3 sm:p-5">
        {error ? <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{error}</div> : null}
        <form className="flex items-center gap-2 rounded-2xl border border-[#3c424d] bg-[#191b20] p-2 pl-4 transition focus-within:border-[#737cff]" onSubmit={submit}>
          <input aria-label="Câu hỏi cho Nexus" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-slate-500" onChange={(event) => setInput(event.target.value)} placeholder="Bắt đầu nhập…" value={input} />
          <span className="hidden text-xs text-slate-500 sm:inline">{projectName}</span>
          <button aria-label="Gửi câu hỏi" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6872f7] text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#7a83ff] disabled:cursor-not-allowed disabled:bg-[#3b4049] disabled:text-slate-500" disabled={!input.trim() || loading} type="submit"><Send aria-hidden="true" size={17} /></button>
        </form>
        <p className="mt-2 text-center text-[11px] text-slate-600">Nexus trả lời dựa trên các nguồn đã chọn trong notebook.</p>
      </div>
    </section>
  );
}

function SourceReferences({ sources }: { sources: RagSourceReference[] }) {
  return <div className="mt-2.5 rounded-2xl border border-[#343942] bg-[#202329] p-3 shadow-sm">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300"><FileText aria-hidden="true" size={14} /> Nguồn tham khảo</div>
    <div className="flex flex-wrap gap-2">{sources.map((source, index) => <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#3c424d] bg-[#292e36] px-2.5 py-1.5 text-xs text-slate-400" key={`${source.id}-${source.chunkIndex}`}><span className="font-semibold text-cyan-300">{index + 1}</span><span className="max-w-52 truncate font-medium text-slate-200">{source.filename}</span><span className="text-slate-500">· Đoạn {source.chunkIndex + 1}</span></span>)}</div>
  </div>;
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

function MessageAvatar({ role }: { role: ChatMessage["role"] }) {
  return <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${role === "user" ? "bg-[#6872f7] text-white" : "border border-[#3d434e] bg-[#292e36] text-slate-200"}`}>{role === "user" ? <UserRound aria-hidden="true" size={16} /> : <Bot aria-hidden="true" size={16} />}</span>;
}

function parseSources(value: string | null): RagSourceReference[] {
  if (!value) return [];
  try { return JSON.parse(decodeURIComponent(value)) as RagSourceReference[]; } catch { return []; }
}
