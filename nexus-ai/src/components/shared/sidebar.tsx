"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  Bot,
  ChevronLeft,
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
  if (!candidate || candidate === "new" || candidate === "demo" || candidate === "board") return undefined;
  return candidate;
}

const STORAGE_KEY = "nexus-sidebar-collapsed";

function subscribeSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("nexus-sidebar-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("nexus-sidebar-change", onStoreChange);
  };
}

function getSidebarPreference() {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSidebarPreference() {
  return false;
}

export function Sidebar({
  requiresOnboarding = false,
}: {
  requiresOnboarding?: boolean;
}) {
  const pathname = usePathname();
  const projectId = getProjectId(pathname);
  const getGuardedHref = (href: string) =>
    requiresOnboarding
      ? `/onboarding?next=${encodeURIComponent(href)}`
      : href;

  // Keep the first server/client render identical while still restoring the
  // user's preference immediately after hydration.
  const collapsed = useSyncExternalStore(
    subscribeSidebarPreference,
    getSidebarPreference,
    getServerSidebarPreference,
  );

  // Sync --sidebar-w CSS variable so header and main offset correctly
  useEffect(() => {
    const update = () => {
      const isMd = window.matchMedia("(min-width: 768px)").matches;
      document.documentElement.style.setProperty(
        "--sidebar-w",
        isMd ? (collapsed ? "72px" : "288px") : "0px",
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [collapsed]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event("nexus-sidebar-change"));
  };

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
      href: projectId ? `/project/${projectId}/board` : "/project/board",
      icon: KanbanSquare,
      isActive: pathname.endsWith("/board"),
    },
    {
      label: "Knowledge Hub",
      href: projectId ? `/project/${projectId}/documents` : "/knowledge",
      icon: Bot,
      isActive:
        pathname === "/knowledge" ||
        (pathname.startsWith("/project/") &&
          pathname.includes("/documents")),
    },
    {
      label: "Team & Bot Chat",
      href: projectId ? `/project/${projectId}/chat` : "/project",
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

  // Avoid layout shift on first render — render expanded until mounted
  const isCollapsed = collapsed;

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/80 bg-white/95 shadow-[12px_0_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl md:flex",
          "transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-72",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "relative flex h-20 shrink-0 items-center border-b border-slate-100",
            isCollapsed ? "justify-center px-0" : "px-5",
          )}
        >
          <Link
            className="group flex min-w-0 items-center gap-3"
            href={getGuardedHref("/")}
            aria-label="Nexus AI"
          >
            <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-cyan-200">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.7),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.65),transparent_48%)]" />
              <Sparkles className="relative" size={20} />
            </span>
            {!isCollapsed && (
              <span className="min-w-0 overflow-hidden">
                <span className="block truncate text-base font-black tracking-tight text-slate-950">
                  Nexus AI
                </span>
                <span className="block truncate text-xs font-medium text-slate-500">
                  Project intelligence
                </span>
              </span>
            )}
          </Link>

          {/* Collapse toggle button */}
          <button
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            className={cn(
              "absolute -right-3.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:bg-slate-50 hover:text-slate-950 hover:shadow-lg",
            )}
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden py-5",
            isCollapsed ? "px-2" : "px-4",
          )}
        >
          <NavigationGroup
            items={workspaceItems}
            label="Workspace"
            collapsed={isCollapsed}
            getHref={getGuardedHref}
          />
          <NavigationGroup
            className="mt-7"
            items={projectItems}
            label={projectId ? "Project hiện tại" : "Công cụ dự án"}
            collapsed={isCollapsed}
            getHref={getGuardedHref}
          />
        </div>

        {/* Footer */}
        <div
          className={cn(
            "shrink-0 border-t border-slate-100",
            isCollapsed ? "p-2 space-y-2" : "p-4 space-y-3",
          )}
        >
          {/* Profile link */}
          <NavTooltip label="Hồ sơ cá nhân" collapsed={isCollapsed}>
            <Link
              href={getGuardedHref("/profile")}
              className={cn(
                "group flex items-center rounded-2xl text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                isCollapsed
                  ? "justify-center p-2"
                  : "gap-3 px-3 py-3",
                (pathname.startsWith("/profile") ||
                  pathname.startsWith("/onboarding")) &&
                  "bg-slate-950 text-white shadow-lg shadow-slate-200 hover:bg-slate-900 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-white",
                  (pathname.startsWith("/profile") ||
                    pathname.startsWith("/onboarding")) &&
                    "bg-white/10 text-cyan-200 group-hover:bg-white/10 group-hover:text-cyan-200",
                )}
              >
                <UserRound size={18} />
              </span>
              {!isCollapsed && (
                <>
                  <span>Hồ sơ cá nhân</span>
                  <ChevronRight className="ml-auto opacity-50" size={16} />
                </>
              )}
            </Link>
          </NavTooltip>

          {/* Status badge — hidden when collapsed */}
          {!isCollapsed && (
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
          )}

          {/* Collapsed status dot */}
          {isCollapsed && (
            <div className="flex justify-center">
              <span
                title="Nexus Core sẵn sàng"
                className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.18)]"
              />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav — unchanged */}
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
              href={getGuardedHref(item.href)}
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

// ─── Tooltip wrapper for collapsed nav items ───────────────────────────────
function NavTooltip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <div className="group/tip relative">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

// ─── Navigation Group ──────────────────────────────────────────────────────
function NavigationGroup({
  className,
  items,
  label,
  collapsed,
  getHref,
}: {
  className?: string;
  items: NavigationItem[];
  label: string;
  collapsed: boolean;
  getHref: (href: string) => string;
}) {
  return (
    <section className={className}>
      {!collapsed && (
        <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
      )}
      {collapsed && <div className="mb-2 h-px bg-slate-100" />}

      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavTooltip key={item.label} label={item.label} collapsed={collapsed}>
              <Link
                aria-current={item.isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center rounded-2xl text-sm font-semibold text-slate-600 transition duration-200 hover:bg-slate-100 hover:text-slate-950",
                  collapsed
                    ? "justify-center p-2 hover:translate-x-0"
                    : "gap-3 px-3 py-2.5 hover:translate-x-0.5",
                  item.isActive &&
                    "bg-slate-950 text-white shadow-lg shadow-slate-200 hover:bg-slate-900 hover:text-white",
                )}
                href={getHref(item.href)}
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
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    <ChevronRight
                      className="ml-auto opacity-0 transition group-hover:opacity-50"
                      size={15}
                    />
                  </>
                )}
              </Link>
            </NavTooltip>
          );
        })}
      </nav>
    </section>
  );
}
