'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, KanbanSquare, LayoutDashboard, MessageSquare } from 'lucide-react';

import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Board', href: '/project/demo/board', icon: KanbanSquare },
  { label: 'Chat', href: '/project/demo/chat', icon: MessageSquare },
  { label: 'Dashboard', href: '/pm-dashboard', icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r bg-white">
      <Link
        href="/"
        className="flex h-16 items-center justify-center border-b text-sm font-black tracking-tight text-slate-950"
        aria-label="Nexus AI"
      >
        NX
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/'
              ? pathname === item.href
              : pathname.startsWith(item.href.replace('/demo', ''));

          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                'flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950',
                active && 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
