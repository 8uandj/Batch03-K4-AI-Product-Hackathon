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
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <strong>Nexus Knowledge Bot</strong>
          <div className="muted">Project · {projectId}</div>
        </div>
        <span className="status-pill">
          <span className="status-dot" /> Sẵn sàng
        </span>
      </header>

      <div className="message-list" aria-live="polite">
        {messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            <span className="avatar">
              {message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}
            </span>
            <div>
              <div className="bubble">{message.content}</div>
              {message.sources?.length ? (
                <div className="source-list">
                  Nguồn:{" "}
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
          </article>
        ))}

        {loading ? (
          <article className="message">
            <span className="avatar">
              <Bot size={16} />
            </span>
            <div className="bubble">
              <span className="typing" aria-label="Bot đang trả lời">
                <span />
                <span />
                <span />
              </span>
            </div>
          </article>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div>
        {error ? <div className="error-banner">{error}</div> : null}
        <form className="chat-form" onSubmit={submit}>
          <input
            aria-label="Câu hỏi cho Nexus"
            className="chat-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Hỏi về scope, deadline, kiến trúc…"
            value={input}
          />
          <button
            aria-label="Gửi câu hỏi"
            className="primary-button"
            disabled={!input.trim() || loading}
            type="submit"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
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
