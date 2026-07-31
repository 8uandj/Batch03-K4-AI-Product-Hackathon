import Link from "next/link";
import { redirect } from "next/navigation";

import { JoinProjectForm } from "@/features/workspace/components/JoinProjectForm";
import { createClient } from "@/lib/supabase/server";

type JoinProjectPageProps = { params: Promise<{ token: string }>; searchParams: Promise<{ status?: string }> };

export const dynamic = "force-dynamic";

export default async function JoinProjectPage({ params, searchParams }: JoinProjectPageProps) {
  const { token } = await params;
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/join/${token}`);

  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect(`/onboarding?next=/join/${token}`);

  if (status === "pending") {
    return (
      <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-amber-950">Invite đang chờ PM duyệt</h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">Bạn đã xác nhận invite. Khi PM duyệt, project sẽ xuất hiện trong danh sách project của bạn.</p>
          <Link className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800" href="/project">Về danh sách project</Link>
        </div>
      </section>
    );
  }

  return <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center"><JoinProjectForm token={token} /></section>;
}
