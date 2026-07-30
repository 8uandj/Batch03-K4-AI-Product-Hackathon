"use client";

import { Bot, Send, UserRound } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import type { ChatMessage, RagSourceReference } from "../types";

type RagChatProps = {
  projectId: string;
};

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Chào bạn, mình là Nexus Knowledge Bot. Hãy hỏi mình về tài liệu của dự án; câu trả lời sẽ kèm nguồn để bạn kiểm tra.",
};

export function RagChat({ projectId }: RagChatProps) {
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

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
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
        body: JSON.stringify({
          message: question,
          history: previous.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Bot chưa thể trả lời.");
      }

      const sources = parseSources(response.headers.get("x-rag-sources"));
      setMessages((current) => [
        ...current,
        { id: answerId, role: "assistant", content: "", sources },
      ]);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Trình duyệt không hỗ trợ streaming.");
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === answerId
              ? { ...message, content: message.content + text }
              : message,
          ),
        );
      }
    } catch (chatError) {
      setError(
        chatError instanceof Error ? chatError.message : "Bot chưa thể trả lời.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <h1 className="text-base font-semibold text-slate-950">
            Nexus Knowledge Bot
          </h1>
          <p className="mt-1 text-xs text-slate-500">Project · {projectId}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-500" /> Sẵn sàng
        </span>
      </header>

      <div
        aria-live="polite"
        className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-5"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <article
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              key={message.id}
            >
              {!isUser ? <MessageAvatar role="assistant" /> : null}
              <div className={`max-w-[min(720px,85%)] ${isUser ? "order-first" : ""}`}>
                <div
                  className={`rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                    isUser
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {message.content || "Đang tổng hợp câu trả lời…"}
                </div>
                {message.sources?.length ? (
                  <div className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                    <span className="font-medium text-slate-700">Nguồn: </span>
                    {message.sources
                      .map(
                        (source, index) =>
                          `[${index + 1}] ${source.filename} · đoạn ${
                            source.chunkIndex + 1
                          }`,
                      )
                      .join(" · ")}
                  </div>
                ) : null}
              </div>
              {isUser ? <MessageAvatar role="user" /> : null}
            </article>
          );
        })}

        {loading ? (
          <article className="flex gap-3">
            <MessageAvatar role="assistant" />
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="flex items-center gap-1" aria-label="Bot đang trả lời">
                <span className="size-2 animate-pulse rounded-full bg-slate-400" />
                <span className="size-2 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
                <span className="size-2 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
              </span>
            </div>
          </article>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-white p-4">
        {error ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <form className="flex gap-3" onSubmit={submit}>
          <input
            aria-label="Câu hỏi cho Nexus"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Hỏi về scope, deadline, kiến trúc…"
            value={input}
          />
          <button
            aria-label="Gửi câu hỏi"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!input.trim() || loading}
            type="submit"
          >
            <Send aria-hidden="true" size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}

function MessageAvatar({ role }: { role: ChatMessage["role"] }) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
        role === "user"
          ? "bg-slate-950 text-white"
          : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      {role === "user" ? (
        <UserRound aria-hidden="true" size={16} />
      ) : (
        <Bot aria-hidden="true" size={16} />
      )}
    </span>
  );
}

function parseSources(value: string | null): RagSourceReference[] {
  if (!value) return [];
  try {
    return JSON.parse(decodeURIComponent(value)) as RagSourceReference[];
  } catch {
    return [];
  }
}
