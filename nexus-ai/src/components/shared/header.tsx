import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  return (
    <header className="fixed left-16 right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-6 backdrop-blur">
      <div>
        <p className="text-sm font-semibold text-slate-950">Nexus AI</p>
        <p className="text-xs text-slate-500">Team workspace</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">User</p>
          <p className="text-xs text-slate-500">Project member</p>
        </div>
        <Avatar className="size-9 ring-2 ring-slate-100">
          <AvatarImage src="/avatar.png" alt="User avatar" />
          <AvatarFallback>US</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
