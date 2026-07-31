"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Bot,
  Clock3,
  ExternalLink,
  HeartHandshake,
  MessageCircleHeart,
  ShieldCheck,
  X,
} from "lucide-react";

import type { ProactiveCheckIn } from "./checkin";

type ProactiveCheckInBubbleProps = {
  projectId: string;
};

type QuickReply = "help" | "okay" | null;

const POLL_INTERVAL_MS = 5 * 60 * 1000;
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
    // The bubble still works when storage is unavailable.
  }
}

export function ProactiveCheckInBubble({
  projectId,
}: ProactiveCheckInBubbleProps) {
  const [checkIn, setCheckIn] = useState<ProactiveCheckIn | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [quickReply, setQuickReply] = useState<QuickReply>(null);
  const shownId = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCheckIn() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/proactive-checkin`,
          { cache: "no-store" },
        );
        if (!response.ok || !isActive) return;

        const payload = (await response.json()) as {
          checkIn: ProactiveCheckIn | null;
        };
        const nextCheckIn = payload.checkIn;

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
        // This assistant is non-blocking; project pages must still work if it fails.
      }
    }

    void loadCheckIn();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCheckIn();
    }, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
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

  function handleMinimize() {
    if (quickReply === "okay") {
      setIsHidden(true);
    }
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        aria-label="Mở tin nhắn hỏi thăm từ Nexus"
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-300/40 transition hover:scale-105 hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <MessageCircleHeart aria-hidden="true" size={24} />
        <span className="absolute right-0 top-0 size-3 rounded-full border-2 border-white bg-rose-500" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Nexus proactive check-in"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-2xl shadow-slate-900/20"
    >
      <header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500">
            <Bot aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 className="text-sm font-black">Nexus Care</h2>
            <p className="flex items-center gap-1 text-[10px] text-slate-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Trợ lý hỏi thăm chủ động
            </p>
          </div>
        </div>
        <button
          aria-label="Thu nhỏ tin nhắn"
          className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          onClick={handleMinimize}
          type="button"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </header>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
              checkIn.kind === "overdue"
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {checkIn.kind === "overdue" ? "Deadline trễ" : "Tải việc cao"}
          </span>
          <span className="text-[10px] text-slate-400">Vừa cập nhật</span>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-950">{checkIn.title}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-700">
            {checkIn.message}
          </p>
          <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-4 text-slate-500">
            {checkIn.detail}
          </p>
        </div>

        {!quickReply && (
          <div className="grid gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700"
              onClick={() => handleQuickReply("help")}
              type="button"
            >
              <HeartHandshake aria-hidden="true" size={15} />
              {checkIn.kind === "overdue"
                ? "Mình đang gặp blocker"
                : "Mình cần sắp xếp lại"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => handleQuickReply("okay")}
              type="button"
            >
              <ShieldCheck aria-hidden="true" size={15} />
              Mình vẫn kiểm soát được
            </button>
          </div>
        )}

        {quickReply === "help" && (
          <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
            <p className="text-xs leading-5 text-violet-950">
              Mình chưa tự động nhắn thay bạn. Bạn có thể cập nhật blocker ở Team
              Chat để PM thấy ngữ cảnh, hoặc mở Board để điều chỉnh task.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-2 py-2 text-[10px] font-bold text-white"
                href={`/project/${projectId}/chat/team`}
                onClick={() => setIsOpen(false)}
              >
                Mở Team Chat <ExternalLink size={11} />
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2 py-2 text-[10px] font-bold text-violet-700"
                href={`/project/${projectId}/board`}
                onClick={() => setIsOpen(false)}
              >
                Xem Board <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        )}

        {quickReply === "okay" && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-xs leading-5 text-emerald-900">
              Cảm ơn bạn đã phản hồi. Mình sẽ tạm ngừng nhắc tín hiệu này trong
              12 giờ; nhớ cập nhật tiến độ để cả nhóm cùng nắm nhé.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 transition hover:text-slate-800"
            onClick={() => handleSnooze(4)}
            type="button"
          >
            <Clock3 aria-hidden="true" size={12} /> Nhắc lại sau 4 giờ
          </button>
          {quickReply && (
            <button
              className="text-[10px] font-bold text-violet-700 transition hover:text-violet-900"
              onClick={() => handleSnooze(quickReply === "okay" ? 12 : 4)}
              type="button"
            >
              Đóng
            </button>
          )}
        </div>

        <p className="flex items-start gap-1.5 text-[9px] leading-4 text-slate-400">
          <BellRing aria-hidden="true" className="mt-0.5 shrink-0" size={10} />
          Nexus chỉ dùng tín hiệu task và deadline, không suy diễn trạng thái tâm
          lý của bạn.
        </p>
      </div>
    </aside>
  );
}
