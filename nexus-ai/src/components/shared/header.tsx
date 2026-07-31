import Link from "next/link";
import { ArrowUpRight, LogIn, LogOut, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/features/auth/actions";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "US"
  );
}

export async function Header() {
  const user = isSupabaseConfigured()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  const displayName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "Khách";
  const email = user?.email || "Chế độ xem trước";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl md:left-72">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg md:hidden"
            href="/"
            aria-label="Nexus AI"
          >
            <Sparkles size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base">
                Nexus Workspace
              </h1>
              <span className="hidden rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700 sm:inline-flex">
                AI native
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
              Project command center
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 lg:flex">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
            System online
          </div>

          {user ? (
            <>
              <Link
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-1.5 pr-3 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                href="/profile"
              >
                <Avatar className="size-9 ring-2 ring-slate-100 transition group-hover:ring-cyan-100">
                  <AvatarImage
                    src={user.user_metadata?.avatar_url || ""}
                    alt="User avatar"
                  />
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-36 text-left sm:block">
                  <span className="block truncate text-xs font-black text-slate-900">
                    {displayName}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {email}
                  </span>
                </span>
                <ArrowUpRight
                  className="hidden text-slate-300 transition group-hover:text-cyan-600 sm:block"
                  size={15}
                />
              </Link>
              <form action={signOut}>
                <button
                  aria-label="Đăng xuất"
                  className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  title="Đăng xuất"
                  type="submit"
                >
                  <LogOut size={17} />
                </button>
              </form>
            </>
          ) : (
            <Link
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-800"
              href="/login"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
