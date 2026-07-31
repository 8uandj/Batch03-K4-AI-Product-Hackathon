import { Bot, MessageSquare, UserRound } from "lucide-react";

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
  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
      <header className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare aria-hidden="true" className="text-slate-500" size={18} />
          <h1 className="font-semibold text-slate-950">Team Chat</h1>
        </div>
        <p className="mt-1 text-xs text-slate-500">Project · {projectId}</p>
      </header>

      <div className="flex-1 space-y-4 bg-slate-50 p-5">
        {mockTeamMessages.map((message) => (
          <article className="flex gap-3" key={message.id}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-white text-slate-700">
              {message.senderType === "assistant" ? (
                <Bot aria-hidden="true" size={16} />
              ) : (
                <UserRound aria-hidden="true" size={16} />
              )}
            </span>
            <div className="max-w-3xl rounded-lg border bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{message.senderName}</span>
                <span>{message.createdAt}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{message.content}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="border-t bg-white p-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          AI conflict support đang ở mock mode. Khi có `chat_messages` live, bot sẽ chỉ can thiệp khi phát hiện tín hiệu conflict rõ ràng.
        </div>
      </div>
    </section>
  );
}
