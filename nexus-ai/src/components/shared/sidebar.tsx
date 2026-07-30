"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  FolderKanban,
  House,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

function getProjectId(pathname: string) {
  const match = pathname.match(/^\/project\/([^/]+)/);
  return match?.[1];
}

export function Sidebar() {
  const pathname = usePathname();
  const projectId = getProjectId(pathname);
  const projectBase = projectId ? `/project/${projectId}` : "/project/demo";
  const navigation = [
    { label: "Home", href: "/", icon: House, isActive: pathname === "/" },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname.startsWith("/dashboard") || pathname.startsWith("/pm-dashboard"),
    },
    {
      label: "Projects",
      href: "/project",
      icon: FolderKanban,
      isActive: pathname === "/project" ||
        (pathname.startsWith("/project/") &&
          !pathname.includes("/board") &&
          !pathname.includes("/chat") &&
          !pathname.includes("/documents")),
    },
    {
      label: projectId ? "Board" : "Board · demo",
      href: `${projectBase}/board`,
      icon: KanbanSquare,
      isActive: pathname.startsWith("/project/") && pathname.endsWith("/board"),
    },
    {
      label: projectId ? "Knowledge" : "Knowledge · demo",
      href: `${projectBase}/documents`,
      icon: Bot,
      isActive: pathname.startsWith("/project/") && pathname.includes("/documents"),
    },
    {
      label: projectId ? "Chat" : "Chat · demo",
      href: `${projectBase}/chat`,
      icon: MessageSquare,
      isActive: pathname.startsWith("/project/") && pathname.includes("/chat"),
    },
    {
      label: "Profile",
      href: "/profile",
      icon: UserRound,
      isActive: pathname.startsWith("/profile") || pathname.startsWith("/onboarding"),
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r bg-white">
      <Link href="/" className="flex h-16 items-center justify-center border-b text-sm font-black tracking-tight text-slate-950" aria-label="Nexus AI">NX</Link>
      <nav className="flex flex-1 flex-col items-center gap-2 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} title={item.label} aria-label={item.label} className={cn("flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950", item.isActive && "bg-slate-900 text-white hover:bg-slate-800 hover:text-white")}>
              <Icon className="size-5" aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
