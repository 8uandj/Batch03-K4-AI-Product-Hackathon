import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "US";
}

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "Guest";
  const subtitle = user ? "Project member" : "Chưa đăng nhập";

  return (
    <header className="fixed left-16 right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-6 backdrop-blur">
      <div>
        <p className="text-sm font-semibold text-slate-950">Nexus AI</p>
        <p className="text-xs text-slate-500">Team workspace</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{displayName}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <Avatar className="size-9 ring-2 ring-slate-100">
          <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt="User avatar" />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        {user ? (
          <form action={signOut}>
            <button
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              type="submit"
            >
              Logout
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
