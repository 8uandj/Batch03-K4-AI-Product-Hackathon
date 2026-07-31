"use client";

import { useActionState } from "react";
import { MailPlus } from "lucide-react";

import { createInvite } from "@/features/workspace/actions";

const initialState: {
  error?: string;
  message?: string;
  inviteLinks?: Array<{ recipient: string; link: string; emailSent: boolean }>;
} = {};

export function InviteMemberForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createInvite, initialState);

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <input name="projectId" type="hidden" value={projectId} />
      <div className="flex items-center gap-2"><MailPlus className="text-slate-500" size={18} /><h3 className="font-semibold text-slate-950">Invite members</h3></div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Nhập nhiều email hoặc user code, mỗi người một dòng hoặc phân tách bằng dấu phẩy.</p>
      <div className="mt-4 space-y-3">
        <textarea className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" name="invitees" placeholder="an@example.com
binh@example.com
NX-AB12CD" />
        <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" name="role" defaultValue="member">
          <option value="member">Member</option>
          <option value="pm">PM</option>
        </select>
        {state.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
        {state.message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p> : null}
        {state.inviteLinks?.length ? (
          <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-xs">
            <p className="font-semibold text-slate-700">Invite links</p>
            {state.inviteLinks.map((invite) => (
              <div className="border-t border-slate-100 pt-2 first:border-0 first:pt-0" key={invite.link}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{invite.recipient}</span>
                  <span className={invite.emailSent ? "text-emerald-600" : "text-amber-600"}>{invite.emailSent ? "Đã gửi email" : "Copy link"}</span>
                </div>
                <a className="mt-1 block break-all font-mono leading-5 text-cyan-700 underline" href={invite.link}>{invite.link}</a>
              </div>
            ))}
          </div>
        ) : null}
        <button className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={pending} type="submit">{pending ? "Đang tạo invite..." : "Tạo invite cho tất cả"}</button>
      </div>
    </form>
  );
}
