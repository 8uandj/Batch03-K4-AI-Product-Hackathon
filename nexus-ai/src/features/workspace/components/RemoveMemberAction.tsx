"use client";

import { UserMinus } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { removeProjectMember } from "@/features/workspace/actions";

function RemoveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      <UserMinus size={14} />
      {pending ? "Đang xóa..." : "Xóa khỏi nhóm"}
    </button>
  );
}

export function RemoveMemberAction({
  projectId,
  memberId,
  onRemoved,
}: {
  projectId: string;
  memberId: string;
  onRemoved: () => void;
}) {
  const [state, action] = useActionState(removeProjectMember, {});

  useEffect(() => {
    if (state.message) onRemoved();
  }, [onRemoved, state.message]);

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <form
        action={action}
        onSubmit={(event) => {
          if (!window.confirm("Xóa thành viên này khỏi nhóm? Các task đang giao sẽ được bỏ người phụ trách.")) {
            event.preventDefault();
          }
        }}
      >
        <input name="projectId" type="hidden" value={projectId} />
        <input name="memberId" type="hidden" value={memberId} />
        <RemoveButton />
      </form>
      {state.error ? <p className="mt-2 text-xs font-medium text-rose-600">{state.error}</p> : null}
    </div>
  );
}
