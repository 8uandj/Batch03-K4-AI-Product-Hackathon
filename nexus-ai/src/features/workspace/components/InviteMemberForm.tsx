"use client";

import { useActionState } from "react";
import { MailPlus } from "lucide-react";

import { createInvite } from "@/features/workspace/actions";

const initialState: { error?: string; inviteLink?: string } = {};

export function InviteMemberForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createInvite, initialState);

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <input name="projectId" type="hidden" value={projectId} />
      <div className="flex items-center gap-2"><MailPlus className="text-slate-500" size={18} /><h3 className="font-semibold text-slate-950">Invite member</h3></div>
      <div className="mt-4 space-y-3">
        <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" name="email" placeholder="Email thành viên" type="email" />
        <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" name="userCode" placeholder="Hoặc user code, ví dụ NX-AB12CD" />
        <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" name="role" defaultValue="member">
          <option value="member">Member</option>
          <option value="pm">PM</option>
        </select>
        {state.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
        {state.inviteLink ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Invite link: <code className="font-mono">{state.inviteLink}</code></div> : null}
        <button className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={pending} type="submit">{pending ? "Đang tạo invite..." : "Tạo invite"}</button>
      </div>
    </form>
  );
}
