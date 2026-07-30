"use client";

import { useActionState, useState } from "react";

import { signIn, signUp } from "@/features/auth/actions";

type AuthFormProps = {
  next: string;
};

type AuthActionState = { error?: string; message?: string };

const initialState: AuthActionState = {};

export function AuthForm({ next }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signInState, signInAction, signingIn] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initialState);
  const state = mode === "login" ? signInState : signUpState;
  const pending = mode === "login" ? signingIn : signingUp;

  return (
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Nexus AI
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Đăng nhập workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Dùng tài khoản Supabase Auth để vào project, chat, dashboard và knowledge hub.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
        <button
          className={`rounded-md px-3 py-2 transition ${
            mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          Login
        </button>
        <button
          className={`rounded-md px-3 py-2 transition ${
            mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
          }`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Sign up
        </button>
      </div>

      <form action={mode === "login" ? signInAction : signUpAction} className="mt-6 space-y-4">
        <input name="next" type="hidden" value={next} />

        {mode === "signup" ? (
          <label className="block text-sm font-medium text-slate-700">
            Tên hiển thị
            <input
              autoComplete="name"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              name="name"
              placeholder="PM Nexus"
            />
          </label>
        ) : null}

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            name="email"
            placeholder="you@nexus.ai"
            required
            type="email"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Mật khẩu
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>

        {state.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {state.message ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.message}
          </div>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={pending}
          type="submit"
        >
          {pending ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>
    </section>
  );
}
