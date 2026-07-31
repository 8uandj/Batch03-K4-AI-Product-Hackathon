"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronRight,
  FolderKanban,
  House,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof House;
  isActive: boolean;
};

function getProjectId(pathname: string) {
  const candidate = pathname.match(/^\/project\/([^/]+)/)?.[1];
  return candidate && candidate !== "new" ? candidate : undefined;
}

export function Sidebar() {
  const pathname = usePathname();
  const projectId = getProjectId(pathname);
  const projectBase = projectId ? `/project/${projectId}` : "/project/demo";

  const workspaceItems: NavigationItem[] = [
    {
      label: "Trang chủ",
      href: "/",
      icon: House,
      isActive: pathname === "/",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive:
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/pm-dashboard"),
    },
    {
      label: "Dự án",
      href: "/project",
      icon: FolderKanban,
      isActive:
        pathname === "/project" ||
        pathname === "/project/new" ||
        (pathname.startsWith("/project/") &&
          !pathname.includes("/board") &&
          !pathname.includes("/chat") &&
          !pathname.includes("/documents")),
    },
  ];

  const projectItems: NavigationItem[] = [
    {
      label: "Kanban Board",
      href: `${projectBase}/board`,
      icon: KanbanSquare,
      isActive: pathname.endsWith("/board"),
    },
    {
      label: "Knowledge Hub",
      href: `${projectBase}/documents`,
      icon: Bot,
      isActive: pathname.includes("/documents"),
    },
    {
      label: "Team & Bot Chat",
      href: `${projectBase}/chat`,
      icon: MessageSquare,
      isActive: pathname.includes("/chat"),
    },
  ];

  const mobileItems = [
    workspaceItems[0],
    workspaceItems[1],
    workspaceItems[2],
    projectItems[2],
    {
      label: "Hồ sơ",
      href: "/profile",
      icon: UserRound,
      isActive:
        pathname.startsWith("/profile") || pathname.startsWith("/onboarding"),
    },
  ];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200/80 bg-white/95 shadow-[12px_0_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl md:flex">
        <div className="flex h-20 items-center border-b border-slate-100 px-5">
          <Link
            className="group flex min-w-0 items-center gap-3"
            href="/"
            aria-label="Nexus AI"
          >
            <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-cyan-200">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.7),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.65),transparent_48%)]" />
              <Sparkles className="relative" size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-tight text-slate-950">
                Nexus AI
              </span>
              <span className="block truncate text-xs font-medium text-slate-500">
                Project intelligence
              </span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <NavigationGroup items={workspaceItems} label="Workspace" />
          <NavigationGroup
            className="mt-7"
            items={projectItems}
            label={projectId ? "Project hiện tại" : "Công cụ dự án"}
          />
        </div>

        <div className="space-y-3 border-t border-slate-100 p-4">
          <Link
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
              (pathname.startsWith("/profile") ||
                pathname.startsWith("/onboarding")) &&
                "bg-slate-950 text-white shadow-lg shadow-slate-200 hover:bg-slate-900 hover:text-white",
            )}
            href="/profile"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-white">
              <UserRound size={18} />
            </span>
            <span>Hồ sơ cá nhân</span>
            <ChevronRight className="ml-auto opacity-50" size={16} />
          </Link>

          <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-4 text-white">
            <div className="absolute -right-8 -top-8 size-24 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="relative flex items-center gap-2 text-xs font-bold text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
              Nexus Core sẵn sàng
            </div>
            <p className="relative mt-2 text-xs leading-5 text-slate-400">
              Docs, task và tín hiệu team trong một workspace.
            </p>
          </div>
        </div>
      </aside>

      <nav
        aria-label="Điều hướng mobile"
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border border-white/70 bg-white/90 p-1.5 shadow-2xl shadow-slate-400/30 backdrop-blur-xl md:hidden"
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              aria-label={item.label}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold text-slate-400 transition",
                item.isActive && "bg-slate-950 text-white shadow-md",
              )}
              href={item.href}
              key={item.label}
            >
              <Icon size={18} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function NavigationGroup({
  className,
  items,
  label,
}: {
  className?: string;
  items: NavigationItem[];
  label: string;
}) {
  return (
    <section className={className}>
      <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition duration-200 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-950",
                item.isActive &&
                  "bg-slate-950 text-white shadow-lg shadow-slate-200 hover:bg-slate-900 hover:text-white",
              )}
              href={item.href}
              key={item.label}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-white group-hover:text-slate-950",
                  item.isActive &&
                    "bg-white/10 text-cyan-200 group-hover:bg-white/10 group-hover:text-cyan-200",
                )}
              >
                <Icon size={18} />
              </span>
              <span className="truncate">{item.label}</span>
              <ChevronRight
                className="ml-auto opacity-0 transition group-hover:opacity-50"
                size={15}
              />
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
