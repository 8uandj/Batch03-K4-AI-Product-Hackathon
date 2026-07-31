"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { approveProjectInvite, rejectProjectInvite } from "@/features/workspace/actions";

function ActionButton({ children, tone }: { children: React.ReactNode; tone: "approve" | "reject" }) {
  const { pending } = useFormStatus();
  return <button className={tone === "approve" ? "inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50" : "inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"} disabled={pending} type="submit">{children}</button>;
}

export function InviteApprovalActions({ inviteId, projectId }: { inviteId: string; projectId: string }) {
  const [approveState, approveAction] = useActionState(approveProjectInvite, {});
  const [rejectState, rejectAction] = useActionState(rejectProjectInvite, {});

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={approveAction}>
        <input name="inviteId" type="hidden" value={inviteId} />
        <input name="projectId" type="hidden" value={projectId} />
        <ActionButton tone="approve"><Check size={13} /> Duyệt</ActionButton>
        {approveState.error ? <p className="mt-1 text-xs text-rose-600">{approveState.error}</p> : null}
      </form>
      <form action={rejectAction}>
        <input name="inviteId" type="hidden" value={inviteId} />
        <input name="projectId" type="hidden" value={projectId} />
        <ActionButton tone="reject"><X size={13} /> Từ chối</ActionButton>
        {rejectState.error ? <p className="mt-1 text-xs text-rose-600">{rejectState.error}</p> : null}
      </form>
    </div>
  );
}
