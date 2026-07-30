"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { acceptInvite } from "@/features/workspace/actions";

const initialState: { error?: string } = {};

export function JoinProjectForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, initialState);

  return (
    <form action={action} className="mx-auto max-w-lg rounded-3xl border bg-white p-6 text-center shadow-sm">
      <input name="token" type="hidden" value={token} />
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white"><UserPlus size={24} /></div>
      <h1 className="mt-5 text-2xl font-black text-slate-950">Join project</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Hệ thống sẽ kiểm tra token, email tài khoản hiện tại và trạng thái invite.</p>
      {state.error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <button className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={pending} type="submit">{pending ? "Đang join..." : "Accept invite"}</button>
    </form>
  );
}
