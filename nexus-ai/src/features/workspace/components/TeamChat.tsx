"use client";

import { useState } from "react";
import { Bot, MessageSquare, Send, UserRound } from "lucide-react";

type TeamChatProps = {
  projectId: string;
};

const mockTeamMessages = [
  {
    id: "msg-1",
    senderName: "Dev UI",
    senderType: "user",
    content: "Chào mọi người, mình vừa tạo repo.",
    createdAt: "2 giờ trước",
  },
  {
    id: "msg-2",
    senderName: "Dev RAG",
    senderType: "user",
    content: "Chào bạn, mình đang bắt đầu viết backend.",
    createdAt: "1 giờ trước",
  },
];

export function TeamChat({ projectId }: TeamChatProps) {
  const [messages, setMessages] = useState(mockTeamMessages);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userText = inputText.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newUserMsg = {
      id: `msg_${Date.now()}`,
      roomType: "team" as const,
      senderName: "Bạn (Tôi)",
      senderType: "user" as const,
      content: userText,
      createdAt: nowTime,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText("");

    const lower = userText.toLowerCase();
    const hasConflictSignal = [
      "không đồng ý",
      "bất đồng",
      "lỗi",
      "delay",
      "chậm",
      "conflict",
      "tranh cãi",
      "phản đối",
      "sao lại",
    ].some((kw) => lower.includes(kw));

    if (hasConflictSignal) {
      setIsSending(true);
      setTimeout(() => {
        const botReply = {
          id: `bot_${Date.now()}`,
          roomType: "team" as const,
          senderName: "Nexus Bot (AI Conflict Resolution)",
          senderType: "assistant" as const,
          content:
            "🤖 Phát hiện tín hiệu bất đồng/thảo luận: Mình gợi ý team tạm thời chia nhỏ vấn đề thành 2 task độc lập và thống nhất tiêu chuẩn trước khi triển khai nhé!",
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botReply]);
        setIsSending(false);
      }, 1000);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      <header className="border-b bg-white px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare aria-hidden="true" className="text-violet-600" size={18} />
            <h1 className="font-bold text-slate-950">Team Chat</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Project ID: <span className="font-mono text-slate-700 font-semibold">{projectId}</span>
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live Chat Space
        </div>
      </header>

      <div className="flex-1 space-y-4 bg-slate-50/70 p-5 overflow-y-auto max-h-[60vh]">
        {messages.map((message) => (
          <article className="flex gap-3" key={message.id}>
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                message.senderType === "assistant"
                  ? "bg-violet-600 text-white border-violet-700"
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
              className={`max-w-2xl rounded-2xl border px-4 py-3 shadow-sm ${
                message.senderType === "assistant"
                  ? "bg-violet-50/60 border-violet-100"
                  : "bg-white border-slate-200/80"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-900">{message.senderName}</span>
                <span className="text-[10px]">{message.createdAt}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{message.content}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="border-t bg-white p-4 space-y-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập tin nhắn trao đổi với nhóm..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Gửi</span>
            <Send size={15} />
          </button>
        </form>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-900 flex items-center gap-2">
          <span className="font-bold">💡 Note:</span> AI conflict support tự động can thiệp khi nhóm thảo luận xuất hiện tín hiệu bất đồng hoặc tranh luận.
        </div>
      </div>
    </section>
  );
}
