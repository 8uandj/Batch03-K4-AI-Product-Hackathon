"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, ExternalLink, HeartHandshake, X } from "lucide-react";

type Notification = {
  id: string;
  project_id: string;
  task_id: string;
  content: string;
  kind: "assignee_check_in" | "leader_escalation" | "force_assign_followup" | "force_assign_warning";
  read_at: string | null;
  created_at: string;
  tone?: "gentle" | "neutral" | "urgent";
  action_link?: string | null;
};

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { notifications?: Notification[]; unreadCount?: number };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 60000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    setNotifications((current) => id ? current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item) : current.map((item) => ({ ...item, read_at: new Date().toISOString() })));
    setUnreadCount((current) => id ? Math.max(0, current - 1) : 0);
  }

  async function respondToFollowup(notification: Notification) {
    setRespondingId(notification.id);
    try {
      const response = await fetch(`/api/projects/${notification.project_id}/tasks/${notification.task_id}/followup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "Tôi cần PM kiểm tra workload và hỗ trợ." }),
      });
      if (!response.ok) return;
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString(), content: "Đã gửi yêu cầu hỗ trợ cho PM. Nexus sẽ giữ lại audit của follow-up này." } : item));
      setUnreadCount((current) => notification.read_at ? current : Math.max(0, current - 1));
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button aria-label="Mở thông báo Deadline Copilot" className="relative flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700" onClick={() => { setOpen((value) => !value); if (!open) void load(); }} type="button">
        <Bell size={17} />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div><h2 className="text-sm font-black text-slate-950">Deadline Copilot</h2><p className="text-[11px] text-slate-500">Thông báo riêng theo task của bạn</p></div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 ? <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" onClick={() => void markRead()} title="Đánh dấu tất cả đã đọc" type="button"><Check size={15} /></button> : null}
            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setOpen(false)} title="Đóng" type="button"><X size={15} /></button>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {loading && !notifications.length ? <p className="p-5 text-center text-xs text-slate-500">Đang tải thông báo…</p> : null}
          {!loading && !notifications.length ? <p className="p-5 text-center text-xs text-slate-500">Chưa có thông báo mới.</p> : null}
          {notifications.map((notification) => {
            const urgent = notification.tone === "urgent" || notification.kind === "leader_escalation" || notification.kind === "force_assign_followup" || notification.kind === "force_assign_warning";
            return <article className={`border-b border-slate-100 p-4 ${notification.read_at ? "bg-white" : urgent ? "bg-rose-50/60" : "bg-cyan-50/60"}`} key={notification.id}>
              <div className="flex gap-3">
                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${urgent ? "bg-rose-100 text-rose-700" : "bg-cyan-100 text-cyan-700"}`}><HeartHandshake size={14} /></span>
                <div className="min-w-0 flex-1"><p className="text-xs leading-5 text-slate-800">{notification.content}</p><p className="mt-1 text-[10px] text-slate-400">{formatTime(notification.created_at)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    {notification.action_link ? <Link className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:underline" href={notification.action_link} onClick={() => { if (!notification.read_at) void markRead(notification.id); }}><ExternalLink size={12} /> Mở task</Link> : null}
                    {(notification.kind === "force_assign_followup" || notification.kind === "force_assign_warning") && !notification.read_at ? <button className="text-[11px] font-bold text-rose-700 hover:underline disabled:opacity-50" disabled={respondingId === notification.id} onClick={() => void respondToFollowup(notification)} type="button">{respondingId === notification.id ? "Đang gửi…" : "Tôi cần hỗ trợ"}</button> : null}
                    {!notification.read_at ? <button className="text-[11px] font-bold text-slate-500 hover:text-slate-900" onClick={() => void markRead(notification.id)} type="button">Đã đọc</button> : null}
                  </div>
                </div>
              </div>
            </article>;
          })}
        </div>
      </div> : null}
    </div>
  );
}
