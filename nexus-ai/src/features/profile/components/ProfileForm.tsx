"use client";

import { useActionState } from "react";

import type { User } from "@/types";

import { updateProfile } from "../actions";

const initialState: { error?: string; message?: string } = {};

export function ProfileForm({ profile }: { profile: User }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="space-y-5 rounded-3xl border bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Tên hiển thị
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" defaultValue={profile.name ?? ""} name="name" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Avatar URL
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" defaultValue={profile.avatar_url ?? ""} name="avatarUrl" />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Bio
        <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2" defaultValue={profile.bio ?? ""} name="bio" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Skills
        <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" defaultValue={profile.skills.join(", ")} name="skills" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        CV URL
        <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" defaultValue={profile.cv_url ?? ""} name="cvUrl" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        CV text
        <textarea className="mt-2 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2" defaultValue={profile.cv_text ?? ""} name="cvText" />
      </label>
      {state.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p> : null}
      <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:bg-slate-400" disabled={pending} type="submit">
        {pending ? "Đang lưu..." : "Cập nhật profile"}
      </button>
    </form>
  );
}
